'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { usePluginHost } from '../../../plugins/host/provider'
import { INSTALLED_PLUGINS } from '../../../plugins/installed'
import { usePermissions } from '../../../store/Permissions/context'
import { ViewerNames } from '../../../types/dbTypes'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '../../ui/Breadcrumb'
import { Input } from '../../ui/Input'
import { VIEWER_CONFIG } from '../Data/utils/viewerConfig'


import { ExtensionCard } from './src/ExtensionCard'
import { effectiveStatus, useExtensionListings } from './src/useExtensionListings'


import type { ExtensionListing, ExtensionsAbility, ExtensionsActions } from './types'

interface Props {
  /**
   * Rows from the app: manifests crossed with `PluginInstallation` and
   * `PluginUserSetting`. Omit and the page falls back to the plugins compiled
   * into this build of core, which is what it shows before persistence exists.
   */
  listings?: ExtensionListing[]
  /** The writes. Omit for a read-only page — controls show but do not save. */
  actions?: ExtensionsActions
}

/**
 * The Extensions page: what plugins this deployment has, and who decided they run.
 *
 * Frame, breadcrumb, title row and search row deliberately mirror `DataMenu`
 * (buildings, sites, files), because this is another item in the same management
 * group and should not read as a different product. The icon is the one already
 * declared for this viewer in `VIEWER_CONFIG`.
 *
 * Two levels of control, deliberately not one switch (see `plugins/enablement.ts`):
 * an admin decides what is available here and what the default is; anyone may then
 * choose for themselves, unless the admin locked it. Which controls appear comes
 * from CASL — and that is presentation only. Every write is re-checked server-side.
 */
export function ExtensionsManager({ listings, actions }: Props) {
  const t = useTranslations('Extensions')
  const tData = useTranslations('DataMenu')
  const { ability } = usePermissions()
  const [searchTerm, setSearchTerm] = React.useState('')

  const viewerConfig = VIEWER_CONFIG[ViewerNames.extensions]
  const headerTitle = t('title')
  const MenuIcon = viewerConfig?.icon

  const resolved = useExtensionListings(listings)
  const connected = actions !== undefined
  const host = usePluginHost()

  /**
   * Local overrides applied on top of the resolved rows.
   *
   * Toggling is optimistic: the switch moves immediately and reverts if the write
   * fails, so the control never sits there looking successful while the server
   * said no. It is also what makes the page usable before persistence exists —
   * the switches work, they just do not survive a reload, which the banner says.
   */
  const [overrides, setOverrides] = React.useState<Record<string, Partial<ExtensionListing>>>({})

  const rows = React.useMemo(
    () => resolved.map(row => {
      const patch = overrides[row.manifest.slug]
      return patch ? { ...row, ...patch } : row
    }),
    [resolved, overrides],
  )

  const canManage: ExtensionsAbility = React.useMemo(() => {
    // `PluginInstallation` is the subject this should use, and new organizations
    // will get it from `defaultRoles.ts`. Existing organizations were seeded
    // before it existed, so no role carries it and `can()` is false for
    // everybody — which rendered this page read-only even for an admin.
    //
    // Until those role rows are back-filled, fall back to `update Organization`:
    // making a plugin available to everyone *is* an organization-configuration
    // change, and that is the permission already gating the organization
    // settings page. Drop the fallback once roles carry the new subject.
    const orgAdmin = ability.can('update', 'PluginInstallation')
      || ability.can('update', 'Organization')

    return {
      canInstall: ability.can('create', 'PluginInstallation') || orgAdmin,
      canConfigureOrg: orgAdmin,
      // Deliberately ungated. A personal preference is self-scoped, the same way
      // changing your own password is — requiring an organizational permission to
      // hide a panel from your own screen would be the wrong shape, and it is
      // what left every role unable to touch anything. The server still binds the
      // write to the session's user id, which is the actual enforcement.
      canChooseForSelf: true,
    }
  }, [ability])

  const filtered = React.useMemo(() => {
    const needle = searchTerm.trim().toLowerCase()
    if (!needle) return rows

    return rows.filter(({ manifest }) =>
      manifest.name.toLowerCase().includes(needle)
      || manifest.slug.toLowerCase().includes(needle)
      || (manifest.description ?? '').toLowerCase().includes(needle)
      || manifest.capabilities.some(capability => capability.toLowerCase().includes(needle)),
    )
  }, [rows, searchTerm])

  // Runtime-discovered plugins an admin has not added yet are a separate decision
  // from managing what is already here, so they get their own section.
  const inOrg = filtered.filter(row => effectiveStatus(row) !== 'available')
  const found = canManage.canInstall
    ? filtered.filter(row => effectiveStatus(row) === 'available')
    : []

  /**
   * Apply a local toggle to the running plugins, so switching one off actually
   * removes its toolbar button instead of only changing a badge.
   *
   * Only while unpersisted. Once the app supplies `actions`, enablement comes back
   * through `enabledSlugs` and `PluginHostProvider` is the single reconciler —
   * two of them racing over the same host would be a bug waiting to happen.
   */
  React.useEffect(() => {
    if (connected || !host) return

    for (const row of rows) {
      const { slug } = row.manifest
      const shouldRun = effectiveStatus(row) === 'running'
      const isRunning = host.getStatus(slug) === 'active'
      if (shouldRun === isRunning) continue

      if (shouldRun) {
        const source = INSTALLED_PLUGINS.find(candidate => candidate.manifest.slug === slug)
        if (source) void host.loadPlugin(source.manifest, source.entry, {})
      } else {
        void host.unloadPlugin(slug)
      }
    }
  }, [rows, host, connected])

  /**
   * Every control routes through here, so optimistic update, revert-on-failure
   * and the toasts are written once rather than per switch.
   *
   * With no `actions` the change is applied locally and stays silent: claiming
   * "saved" would be a lie, and the banner already explains why nothing persists.
   */
  const commit = React.useCallback(
    async (
      slug: string,
      name: string,
      patch: Partial<ExtensionListing>,
      write: (() => Promise<void>) | undefined,
      success: string,
    ) => {
      setOverrides(current => ({ ...current, [slug]: { ...current[slug], ...patch } }))
      if (!write) return

      try {
        await write()
        toast.success(success)
      } catch (error) {
        console.error('Extension update failed:', error)
        setOverrides(current => {
          const { [slug]: _reverted, ...rest } = current
          return rest
        })
        toast.error(t('toastFailed', { name }))
      }
    },
    [t],
  )

  return (
    <div className="sm:p-2 overflow-hidden bg-[#fafafa] h-full">
      <div className="bg-background rounded-xl shadow h-full min-h-0">
        <div className="flex flex-col h-full min-h-0">

          {/* Breadcrumb Navigation */}
          <div className="flex flex-row gap-2 justify-start items-center px-3 py-4 relative">
            <Breadcrumb className="px-3">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{headerTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Title Row */}
          <div className="flex flex-row justify-between items-center px-6 py-6">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                {MenuIcon && <MenuIcon className="h-8 w-8" />}
                <h1 className="text-2xl text-foreground">{headerTitle}</h1>
              </div>
              <h2 className="text-sm text-muted-foreground font-normal max-w-[70ch]">
                {t('intro')}
              </h2>
            </div>
          </div>

          {/* Search Row */}
          <div className="flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center px-3 sm:px-6 py-4 gap-3 sm:gap-4">
            <div className="w-full sm:w-96">
              <Input
                placeholder={`${tData('searchPlaceholder')} ${headerTitle}...`}
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                aria-label={t('searchPlaceholder')}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 pb-8">
            {!connected && (
              <p
                role="status"
                data-testid="extensions-not-connected"
                className="mb-4 flex items-start gap-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {t('toastNotConnected')}
              </p>
            )}

            {rows.length === 0 ? (
              <Empty text={canManage.canInstall ? t('emptyAdmin') : t('empty')} />
            ) : filtered.length === 0 ? (
              <Empty text={t('noResults', { query: searchTerm.trim() })} />
            ) : (
              <>
                {inOrg.length > 0 && (
                  <Section
                    title={t('sectionAvailable')}
                    hint={t('countPlugins', { count: inOrg.length })}
                  >
                    {inOrg.map(row => (
                      <Row
                        key={row.manifest.slug}
                        listing={row}
                        ability={canManage}
                        actions={actions}
                        commit={commit}
                      />
                    ))}
                  </Section>
                )}

                {found.length > 0 && (
                  <Section title={t('sectionFound')} hint={t('sectionFoundHint')}>
                    {found.map(row => (
                      <Row
                        key={row.manifest.slug}
                        listing={row}
                        ability={canManage}
                        actions={actions}
                        commit={commit}
                      />
                    ))}
                  </Section>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

type Commit = (
  slug: string,
  name: string,
  patch: Partial<ExtensionListing>,
  write: (() => Promise<void>) | undefined,
  success: string,
) => Promise<void>

/** Binds one listing's controls to the shared commit path. */
function Row({
  listing,
  ability,
  actions,
  commit,
}: {
  listing: ExtensionListing
  ability: ExtensionsAbility
  actions?: ExtensionsActions
  commit: Commit
}) {
  const t = useTranslations('Extensions')
  const { slug } = listing.manifest
  // Toasts name the plugin the way the user sees it in the card.
  const name = listing.manifest.name

  return (
    <ExtensionCard
      listing={listing}
      ability={ability}
      onSetInstalled={installed => void commit(
        slug,
        name,
        { installed, status: installed ? 'off' : 'available' },
        actions && (() => actions.setInstalled(slug, installed)),
        installed ? t('toastInstalled', { name }) : t('toastUninstalled', { name }),
      )}
      onSetOrgEnabled={enabled => void commit(
        slug,
        name,
        { orgEnabled: enabled },
        actions && (() => actions.setOrgEnabled(slug, enabled)),
        enabled ? t('toastOrgEnabled', { name }) : t('toastOrgDisabled', { name }),
      )}
      onSetAllowUserOverride={allow => void commit(
        slug,
        name,
        { allowUserOverride: allow },
        actions && (() => actions.setAllowUserOverride(slug, allow)),
        allow ? t('toastOverrideAllowed', { name }) : t('toastOverrideBlocked', { name }),
      )}
      onSetUserEnabled={enabled => void commit(
        slug,
        name,
        { userEnabled: enabled },
        actions && (() => actions.setUserEnabled(slug, enabled)),
        enabled ? t('toastUserEnabled', { name }) : t('toastUserDisabled', { name }),
      )}
      onCopyError={() => {
        void navigator.clipboard?.writeText(listing.error ?? '')
          .then(() => toast.success(t('errorCopied')))
          .catch(() => toast.error(t('toastFailed', { name })))
      }}
    />
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-8 last:mb-0">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-sm text-foreground">{title}</h2>
        <span className="text-sm text-muted-foreground">{hint}</span>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {text}
    </p>
  )
}
