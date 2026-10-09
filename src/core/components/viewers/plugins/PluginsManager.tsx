'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { usePluginHost } from '../../../plugins/host/provider'
import { INSTALLED_PLUGINS } from '../../../plugins/installed'
import { resolvePluginEntry } from '../../../plugins/sdk/types'
import { usePermissions } from '../../../store/Permissions/context'
import { ViewerNames } from '../../../types/dbTypes'
import ConfirmDialog from '../../ConfirmDialog'
import { Badge } from '../../ui/Badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '../../ui/Breadcrumb'
import { Input } from '../../ui/Input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/Tabs'
import { VIEWER_CONFIG } from '../Data/utils/viewerConfig'


import { InstallHereButton } from './src/InstallHereButton'
import { visibleColumns } from './src/pluginColumns'
import { PluginDetails } from './src/PluginDetails'
import { InstallQuickControl, OrgQuickControl, UserQuickControl } from './src/PluginQuickControls'
import { PLUGIN_ROW_GRID, PluginRow, pluginRowStyle } from './src/PluginRow'
import { isInTab, isMine, matchesSearch, mergePluginRows, registryStanding } from './src/pluginRows'
import { effectiveStatus } from './src/pluginStatus'
import { isPublishState } from './src/publishState'
import { RegistryDetails } from './src/RegistryDetails'
import { RegistryToolbar } from './src/RegistryToolbar'
import { nextSort, rowName, SORT_KEYS, sortPluginRows } from './src/sortPluginRows'
import { useFittedColumns } from './src/useFittedColumns'
import { usePluginsActions, usePluginsData } from './src/usePluginsData'
import { useRegistryActions, useRegistryPlugins } from './src/useRegistryPlugins'
import { VisibleToPicker } from './src/VisibleToPicker'


import type { PluginColumn } from './src/pluginColumns'
import type { DevTeamView, PluginRowData, PluginsTab } from './src/pluginRows'
import type { RegistryScope } from './src/RegistryToolbar'
import type { PluginSort, SortKey } from './src/sortPluginRows'
import type { PluginListing, PluginsAbility, PluginsActions, RegistryActions } from './types'

interface Props {
  /** Override the rows. Normally omitted; the page reads them through the `ApiAdapter`. */
  listings?: PluginListing[]
  /** Override the writes. Normally omitted; they bind to the API by default. */
  actions?: PluginsActions
  /** Override the shared-registry writes. Normally omitted; they bind to `/api/plugins/registry`. */
  registryActions?: RegistryActions
}

/**
 * The Plugins page: one row per plugin, holding its organization state and its registry state.
 * Tabs only filter those rows. CASL decides which controls render; every write is re-checked server-side.
 */
export function PluginsManager({ listings, actions, registryActions }: Props) {
  const t = useTranslations('PluginsPage')
  const tRegistry = useTranslations('PluginRegistry')
  const { ability: casl } = usePermissions()
  const [searchTerm, setSearchTerm] = React.useState('')
  const [tab, setTab] = React.useState<PluginsTab>('all')
  const [scope, setScope] = React.useState<RegistryScope>('all')

  const viewerConfig = VIEWER_CONFIG[ViewerNames.plugins]
  const headerTitle = t('title')
  const MenuIcon = viewerConfig?.icon

  const { listings: resolved, isLoading } = usePluginsData(listings)
  const boundActions = usePluginsActions(actions)
  const host = usePluginHost()
  const { registry } = useRegistryPlugins()
  const boundRegistryActions = useRegistryActions(registryActions)

  // Optimistic overrides: the switch moves at once, reverts if the write fails, and the next fetch clears it.
  const [overrides, setOverrides] = React.useState<Record<string, Partial<PluginListing>>>({})

  const listingRows = React.useMemo(
    () => resolved.map(row => {
      const patch = overrides[row.manifest.slug]
      return patch ? { ...row, ...patch } : row
    }),
    [resolved, overrides],
  )

  // Mirrors the checks the plugin routes make: granting more here only shows controls the server refuses.
  const ability: PluginsAbility = React.useMemo(() => {
    const orgAdmin = casl.can('update', 'PluginInstallation')

    return {
      canInstall: casl.can('create', 'PluginInstallation') || orgAdmin,
      canConfigureOrg: orgAdmin,
      canChooseForSelf: casl.can('update', 'PluginUserSetting'),
    }
  }, [casl])

  const rows = React.useMemo(
    () => mergePluginRows(listingRows, registry.configured ? registry.plugins : []),
    [listingRows, registry],
  )

  const devTeam: DevTeamView | null = React.useMemo(
    () => (registry.configured && registry.viewer
      ? { canGrant: registry.viewer.canGrant, canPublishFromDisk: registry.viewer.canPublishFromDisk ?? false }
      : null),
    [registry],
  )
  const canGrant = devTeam?.canGrant ?? false
  const hasRegistryStanding = rows.some(row => registryStanding(row, devTeam) !== null)
  const columns = React.useMemo(
    () => visibleColumns(ability, canGrant, hasRegistryStanding),
    [ability, canGrant, hasRegistryStanding],
  )
  const [sort, setSort] = React.useState<PluginSort | null>(null)

  const tabs: PluginsTab[] = [
    'all',
    'running',
    'installed',
    ...(ability.canInstall ? ['notInstalled' as const] : []),
    ...(registry.configured ? ['registry' as const] : []),
  ]

  const needle = searchTerm.trim().toLowerCase()
  const rowsFor = (target: PluginsTab) => rows.filter(row =>
    isInTab(row, target, tabs)
    && matchesSearch(row, needle)
    && (target !== 'registry' || scope === 'all' || isMine(row)))
  const sortedRowsFor = (target: PluginsTab) => sortPluginRows(rowsFor(target), sort)

  // Reflect a saved change in the running viewer at once; `PluginHostProvider` converges on the same state.
  React.useEffect(() => {
    if (!host) return

    for (const row of listingRows) {
      const { slug } = row.manifest
      const shouldRun = effectiveStatus(row) === 'running'
      const isRunning = host.getStatus(slug) === 'active'
      if (shouldRun === isRunning) continue

      if (shouldRun) {
        const source = INSTALLED_PLUGINS.find(candidate => candidate.manifest.slug === slug)
        if (source) {
          void resolvePluginEntry(source.entry)
            .then(entry => host.loadPlugin(source.manifest, entry, {}))
            .catch(error => console.error(`Failed to load plugin "${slug}":`, error))
        }
      } else {
        void host.unloadPlugin(slug)
      }
    }
  }, [listingRows, host])

  // Every control routes through here, so the optimistic update, the revert and the toasts are written once.
  const commit = React.useCallback(
    async (
      slug: string,
      name: string,
      patch: Partial<PluginListing>,
      write: () => Promise<void>,
      success: string,
    ) => {
      setOverrides(current => ({ ...current, [slug]: { ...current[slug], ...patch } }))

      try {
        await write()
        toast.success(success)
      } catch (error) {
        console.error('Plugin update failed:', error)
        setOverrides(current => {
          const { [slug]: _reverted, ...rest } = current
          return rest
        })
        toast.error(t('toastFailed', { name }))
      }
    },
    [t],
  )

  const tabLabel: Record<PluginsTab, string> = {
    all: t('tabAll'),
    running: t('tabRunning'),
    installed: t('tabInstalled'),
    notInstalled: t('tabNotInstalled'),
    registry: tRegistry('tabLabel'),
  }

  const emptyText = (target: PluginsTab): string => {
    if (needle) return t('noResults', { query: searchTerm.trim() })
    if (target === 'registry') return emptyRegistryText()
    if (target === 'notInstalled') return t('emptyNotInstalled')
    if (target === 'running') return t('emptyRunning')
    if (isLoading && resolved.length === 0) return t('loading')
    return ability.canInstall ? t('emptyAdmin') : t('empty')
  }

  const emptyRegistryText = (): string => {
    if (scope === 'mine') return tRegistry('emptyMine')
    if (devTeam?.canPublishFromDisk) return tRegistry('empty')
    return canGrant ? tRegistry('emptyImport') : tRegistry('emptyAwaitingImport')
  }

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
            <div className="flex items-center gap-2">
              {MenuIcon && <MenuIcon className="h-8 w-8" />}
              <h1 className="text-2xl text-foreground">{headerTitle}</h1>
            </div>
          </div>

          <Tabs
            value={tab}
            onValueChange={value => setTab(value as PluginsTab)}
            className="flex flex-1 min-h-0 flex-col"
          >
            {/* Tabs and Search Row */}
            <div className="flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-end px-3 sm:px-6 py-4 gap-3 sm:gap-4">
              {tabs.length > 1 ? (
                <TabsList className="w-auto sm:flex-1">
                  {tabs.map(target => (
                    <TabsTrigger key={target} value={target}>
                      {tabLabel[target]}
                      <Badge className="ml-1 tabular-nums">{rowsFor(target).length}</Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              ) : <span />}
              <div className="w-full sm:w-80">
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  aria-label={t('searchPlaceholder')}
                />
              </div>
            </div>

            {tabs.map(target => (
              <TabsContent
                key={target}
                value={target}
                className="mt-0 flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 pb-8"
                data-testid={target === 'registry' ? 'plugin-registry' : `plugins-tab-${target}`}
              >
                {target === 'registry' && (
                  <RegistryToolbar
                    registry={registry}
                    actions={boundRegistryActions}
                    scope={scope}
                    onScopeChange={setScope}
                  />
                )}
                {target === 'notInstalled' && (
                  <p className="mb-3 text-sm text-muted-foreground">{t('tabNotInstalledHint')}</p>
                )}

                <PluginTable
                  rows={sortedRowsFor(target)}
                  columns={columns}
                  sort={sort}
                  onSort={key => setSort(current => nextSort(current, key))}
                  emptyText={emptyText(target)}
                >
                  {(row, fittedColumns) => (
                    <Row
                      key={row.slug}
                      row={row}
                      columns={fittedColumns}
                      ability={ability}
                      actions={boundActions}
                      commit={commit}
                      devTeam={devTeam}
                      registryActions={boundRegistryActions}
                    />
                  )}
                </PluginTable>
              </TabsContent>
            ))}
          </Tabs>

        </div>
      </div>
    </div>
  )
}

const COLUMN_LABEL_KEY = {
  name: 'columnPlugin',
  version: 'columnVersion',
  status: 'columnStatus',
  run: 'columnRun',
  install: 'columnInstall',
  enable: 'columnEnable',
  visibleTo: 'columnVisibleTo',
  registry: 'columnRegistry',
} as const satisfies Record<PluginColumn, string>

const isSortKey = (column: PluginColumn): column is SortKey => (SORT_KEYS as readonly string[]).includes(column)

function PluginTable({
  rows,
  columns,
  sort,
  onSort,
  emptyText,
  children,
}: {
  rows: PluginRowData[]
  columns: readonly PluginColumn[]
  sort: PluginSort | null
  onSort: (key: SortKey) => void
  emptyText: string
  children: (row: PluginRowData, columns: readonly PluginColumn[]) => React.ReactNode
}) {
  const t = useTranslations('PluginsPage')
  const [tableRef, fitted] = useFittedColumns(columns)

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    )
  }

  return (
    <div ref={tableRef} className="min-w-0 overflow-hidden rounded-xl border">
      <div
        role="row"
        className={`${PLUGIN_ROW_GRID} border-b bg-muted/30 px-3 py-1 text-xs text-muted-foreground`}
        style={pluginRowStyle(fitted)}
      >
        {fitted.map(column => {
          const label = t(COLUMN_LABEL_KEY[column])
          const className = column === 'name' ? 'pl-6' : undefined
          if (!isSortKey(column)) return <span key={column} role="columnheader" className={className}>{label}</span>

          const direction = sort?.key === column ? sort.direction : null
          const SortIcon = direction === 'asc' ? LR.ArrowUp : direction === 'desc' ? LR.ArrowDown : LR.ArrowUpDown
          return (
            <span
              key={column}
              role="columnheader"
              aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}
              className={className}
            >
              <button
                type="button"
                className="-mx-1 inline-flex items-center gap-1 rounded px-1 py-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onSort(column)}
                aria-label={t('sortBy', { column: label })}
              >
                {label}
                <SortIcon aria-hidden className={direction ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5 opacity-40'} />
              </button>
            </span>
          )
        })}
      </div>
      <ul>{rows.map(row => children(row, fitted))}</ul>
    </div>
  )
}

type Commit = (
  slug: string,
  name: string,
  patch: Partial<PluginListing>,
  write: () => Promise<void>,
  success: string,
) => Promise<void>

/** Binds one row's controls to the shared commit path and the registry. */
function Row({
  row,
  columns,
  ability,
  actions,
  commit,
  devTeam,
  registryActions,
}: {
  row: PluginRowData
  columns: readonly PluginColumn[]
  ability: PluginsAbility
  actions: PluginsActions
  commit: Commit
  devTeam: DevTeamView | null
  registryActions: RegistryActions
}) {
  const t = useTranslations('PluginsPage')
  const { slug, listing, entry } = row
  const name = rowName(row)
  const canGrant = devTeam?.canGrant ?? false
  const standing = registryStanding(row, devTeam)
  const publishing = listing && standing && isPublishState(standing) ? { manifest: listing.manifest, state: standing } : undefined
  const showRegistry = Boolean(devTeam && (entry || publishing))
  const [open, setOpen] = React.useState(false)
  const [confirmingUninstall, setConfirmingUninstall] = React.useState(false)

  const setOrgEnabled = (enabled: boolean) => void commit(
    slug,
    name,
    { orgEnabled: enabled },
    () => actions.setOrgEnabled(slug, enabled),
    enabled ? t('toastOrgEnabled', { name }) : t('toastOrgDisabled', { name }),
  )
  const setUserEnabled = (enabled: boolean) => void commit(
    slug,
    name,
    { userEnabled: enabled },
    () => actions.setUserEnabled(slug, enabled),
    enabled ? t('toastUserEnabled', { name }) : t('toastUserDisabled', { name }),
  )
  const writeInstalled = (installed: boolean) => void commit(
    slug,
    name,
    { installed, status: installed ? 'off' : 'available' },
    () => actions.setInstalled(slug, installed),
    installed ? t('toastInstalled', { name }) : t('toastUninstalled', { name }),
  )
  const setInstalled = (installed: boolean) => (installed ? writeInstalled(true) : setConfirmingUninstall(true))

  return (
    <>
      <PluginRow
        open={open}
        onOpenChange={setOpen}
        columns={columns}
        cells={{
          run: <UserQuickControl listing={listing} ability={ability} name={name} onSetUserEnabled={setUserEnabled} />,
          install: <InstallQuickControl listing={listing} ability={ability} name={name} onSetInstalled={setInstalled} onReview={() => setOpen(true)} />,
          enable: <OrgQuickControl listing={listing} ability={ability} name={name} onSetOrgEnabled={setOrgEnabled} />,
          visibleTo: entry && canGrant ? <VisibleToPicker plugin={entry} actions={registryActions} /> : null,
        }}
        slug={slug}
        name={name}
        icon={listing?.manifest.icon ?? entry?.icon}
        version={listing?.manifest.version ?? entry?.latestVersion ?? null}
        status={listing ? effectiveStatus(listing) : undefined}
        standing={standing}
      >
        {listing ? (
          <PluginDetails
            listing={listing}
            ability={ability}
            onSetInstalled={setInstalled}
            onSetOrgEnabled={setOrgEnabled}
            onSetAllowUserOverride={allow => void commit(
              slug,
              name,
              { allowUserOverride: allow },
              () => actions.setAllowUserOverride(slug, allow),
              allow ? t('toastOverrideAllowed', { name }) : t('toastOverrideBlocked', { name }),
            )}
            onSetUserEnabled={setUserEnabled}
            onCopyError={() => {
              void navigator.clipboard?.writeText(listing.error ?? '')
                .then(() => toast.success(t('errorCopied')))
                .catch(() => toast.error(t('toastFailed', { name })))
            }}
          />
        ) : (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">
              {entry?.description && <span className="mb-1 block text-foreground">{entry.description}</span>}
              {t('notInOrg')}
            </p>
            {canGrant && entry?.latestVersion && <InstallHereButton slug={slug} name={name} actions={registryActions} />}
          </div>
        )}

        {showRegistry && (
          <RegistryDetails
            entry={entry}
            publishing={publishing}
            canGrant={canGrant}
            actions={registryActions}
          />
        )}
      </PluginRow>

      <ConfirmDialog
        isOpen={confirmingUninstall}
        onOpenChange={setConfirmingUninstall}
        handleConfirm={event => {
          event.preventDefault()
          setConfirmingUninstall(false)
          writeInstalled(false)
        }}
        title={t('uninstallTitle', { name })}
        description={t('uninstallDescription')}
        confirmLabel={t('uninstallConfirm')}
        cancelLabel={t('cancel')}
      />
    </>
  )
}
