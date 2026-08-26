'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { resolvePluginIcon } from '../../../../plugins/host/pluginIcon'
import { usePluginMessage } from '../../../../plugins/sdk/messages'
import { cn } from '../../../../utils/utils'
import { Badge } from '../../../ui/Badge'
import { Button } from '../../../ui/Button'
import { Separator } from '../../../ui/Separator'
import { Switch } from '../../../ui/Switch'

import { effectiveStatus } from './pluginStatus'

import type { PluginListing, PluginsAbility } from '../types'
import type { LucideIcon } from 'lucide-react'

// Icon and colour both, so status survives a quick scan and colour-blindness.
const STATUS_STYLE: Record<PluginListing['status'], { icon: LucideIcon; className: string }> = {
  running: {
    icon: LR.CheckCircle2,
    className: 'border-green-600/40 bg-green-600/10 text-green-700 dark:text-green-400',
  },
  off: {
    icon: LR.CircleSlash,
    className: 'border-muted-foreground/40 bg-muted text-muted-foreground',
  },
  error: {
    icon: LR.AlertTriangle,
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
  available: {
    icon: LR.PackagePlus,
    className: 'border-sky-600/40 bg-sky-600/10 text-sky-700 dark:text-sky-400',
  },
}

// Which surface a capability contributes to: an icon reads faster than the dotted key.
const CAPABILITY_ICON: Record<string, LucideIcon> = {
  'map.tools': LR.Map,
  'viewer.legends': LR.SquareMenu,
  'map.layers': LR.Layers,
  'bim.tools': LR.Box,
  'pointcloud.tools': LR.Grip,
  'data.pages': LR.Table2,
  'viewer.tabs': LR.PanelLeft,
  'ui.dialogs': LR.SquareStack,
}

interface Props {
  listing: PluginListing
  ability: PluginsAbility
  onSetInstalled: (installed: boolean) => void
  onSetOrgEnabled: (enabled: boolean) => void
  onSetAllowUserOverride: (allow: boolean) => void
  onSetUserEnabled: (enabled: boolean) => void
  onCopyError: () => void
}

export function PluginCard({
  listing,
  ability,
  onSetInstalled,
  onSetOrgEnabled,
  onSetAllowUserOverride,
  onSetUserEnabled,
  onCopyError,
}: Props) {
  const t = useTranslations('PluginsPage')
  const { manifest } = listing
  // From the switches, not the host: otherwise turning a plugin off leaves the badge
  // reading "Running".
  const status = effectiveStatus(listing)

  const Icon = resolvePluginIcon(manifest.icon ?? 'Puzzle')

  // The plugin's catalog when it ships one, its manifest when it does not — never a
  // raw message key.
  const name = usePluginMessage(manifest.slug, 'name', manifest.name)
  const description = usePluginMessage(manifest.slug, 'description', manifest.description ?? '')

  const isAdmin = ability.canConfigureOrg || ability.canInstall
  const userMayChoose = listing.allowUserOverride && ability.canChooseForSelf && status !== 'error'
  const userEnabled = listing.userEnabled ?? listing.orgEnabled

  return (
    <article
      className="grid gap-4 rounded-xl border bg-background p-5 md:grid-cols-[minmax(0,1fr)_auto]"
      data-testid={`plugin-${manifest.slug}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Icon
            aria-hidden
            className="h-5 w-5 shrink-0 text-muted-foreground"
            data-testid={`plugin-icon-${manifest.slug}`}
          />
          <h2 className="text-lg text-foreground">{name}</h2>
          <StatusBadge status={status} />
          {listing.bundled && (
            <Badge variant="outline" className="font-normal text-muted-foreground">
              {t('bundled')}
            </Badge>
          )}
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          <code>{manifest.slug}</code>
          <span className="mx-1.5 opacity-40">·</span>
          <span className="tabular-nums">v{manifest.version}</span>
          <span className="mx-1.5 opacity-40">·</span>
          {manifest.author || t('unknownAuthor')}
        </p>

        {description && <p className="mt-2 max-w-[60ch] text-sm">{description}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t('capabilities')}</span>
          {manifest.capabilities.map(capability => (
            <CapabilityBadge key={capability} capability={capability} />
          ))}
        </div>

        {status === 'error' && listing.error && (
          <div className="mt-3 rounded-xl border border-destructive/50 bg-destructive/5 p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
              <LR.AlertTriangle className="h-4 w-4 shrink-0" />
              {t('errorHeading')}
            </p>
            <p className="mt-1.5 overflow-x-auto text-xs"><code>{listing.error}</code></p>
            <p className="mt-1.5 text-xs text-muted-foreground">{t('errorHint')}</p>
          </div>
        )}

        {status === 'available' && (
          <div className="mt-3 rounded-xl border border-dashed p-3">
            <p className="text-sm font-medium">{t('trustHeading')}</p>
            <ul className="mt-1.5 list-disc pl-4 text-xs text-muted-foreground">
              {listing.mountPath && <li>{t('trustMount', { path: listing.mountPath })}</li>}
              <li>
                {manifest.requiredPermissions?.length
                  ? t('trustPermissions', { permissions: manifest.requiredPermissions.join(', ') })
                  : t('trustNoPermissions')}
              </li>
              <li>{t('trustWarning')}</li>
            </ul>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2.5 md:w-[270px]">
        {status === 'available' ? (
          ability.canInstall && (
            <Button size="sm" onClick={() => onSetInstalled(true)}>
              <LR.PackagePlus className="mr-1.5 h-4 w-4" />
              {t('addToOrg')}
            </Button>
          )
        ) : (
          <>
            {isAdmin ? (
              <ControlGroup label={t('orgGroup')} who={t('orgGroupWho')}>
                {ability.canInstall && (
                  <ControlRow label={t('orgInstalled')}>
                    <Switch
                      checked={listing.installed}
                      onCheckedChange={onSetInstalled}
                      aria-label={t('orgInstalled')}
                    />
                  </ControlRow>
                )}
                {ability.canConfigureOrg && (
                  <>
                    <ControlRow label={t('orgEnabled')}>
                      <Switch
                        checked={listing.orgEnabled}
                        onCheckedChange={onSetOrgEnabled}
                        aria-label={t('orgEnabled')}
                      />
                    </ControlRow>
                    <ControlRow
                      label={t('orgAllowOverride')}
                      hint={listing.allowUserOverride
                        ? t('orgAllowOverrideOnHint')
                        : t('orgAllowOverrideOffHint')}
                    >
                      <Switch
                        checked={listing.allowUserOverride}
                        onCheckedChange={onSetAllowUserOverride}
                        aria-label={t('orgAllowOverride')}
                      />
                    </ControlRow>
                  </>
                )}
              </ControlGroup>
            ) : (
              <ControlGroup label={t('orgGroup')}>
                <p className="py-1 text-sm text-muted-foreground">{orgSummary(listing, t)}</p>
              </ControlGroup>
            )}

            <ControlGroup label={t('userGroup')}>
              {status === 'error' ? (
                <Note icon={LR.Minus} text={t('userNothingToRun')} />
              ) : userMayChoose ? (
                <ControlRow label={t('userRun')}>
                  <Switch
                    checked={userEnabled}
                    onCheckedChange={onSetUserEnabled}
                    aria-label={t('userRun')}
                  />
                </ControlRow>
              ) : !ability.canChooseForSelf ? (
                // Not the admin lock below: nothing is locked, this reader just may
                // not change what runs.
                <Note icon={LR.Eye} text={t('userReadOnly')} />
              ) : (
                <Note icon={LR.Lock} text={listing.orgEnabled ? t('userLockedOn') : t('userLockedOff')} />
              )}
            </ControlGroup>

            {status === 'error' && (
              <Button size="sm" variant="outline" onClick={onCopyError}>
                {t('copyError')}
              </Button>
            )}
          </>
        )}
      </div>
    </article>
  )
}

function StatusBadge({ status }: { status: PluginListing['status'] }) {
  const t = useTranslations('PluginsPage')
  const { icon: Icon, className } = STATUS_STYLE[status]

  const label: Record<PluginListing['status'], string> = {
    running: t('statusRunning'),
    off: t('statusOff'),
    error: t('statusError'),
    available: t('statusAvailable'),
  }

  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', className)}>
      <Icon className="h-3.5 w-3.5" />
      {label[status]}
    </Badge>
  )
}

function CapabilityBadge({ capability }: { capability: string }) {
  const Icon = CAPABILITY_ICON[capability] ?? LR.Puzzle

  return (
    <Badge variant="secondary" className="gap-1 font-normal">
      <Icon className="h-3.5 w-3.5" />
      <code>{capability}</code>
    </Badge>
  )
}

// A bordered, faintly-tinted box so the controls read as a panel rather than loose
// text, borrowing the muted token the app uses for inset surfaces.
function ControlGroup({
  label,
  who,
  children,
}: {
  label: string
  who?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-muted/30 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {label}
        {who && (
          <Badge variant="outline" className="bg-background px-1.5 py-0 text-[10px] font-normal">
            {who}
          </Badge>
        )}
      </div>
      <Separator className="my-2" />
      {children}
    </div>
  )
}

/** Rows inside a group are separated, so three switches do not run together. */
function ControlRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 [&+&]:border-t [&+&]:border-border/60">
      <span className="text-sm leading-tight">
        {label}
        {hint && <small className="mt-0.5 block text-xs text-muted-foreground">{hint}</small>}
      </span>
      {children}
    </div>
  )
}

function Note({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <p className="flex items-start gap-1.5 py-1 text-sm text-muted-foreground">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{text}</span>
    </p>
  )
}

/** What a non-admin is told about the organization's decision. */
function orgSummary(
  listing: PluginListing,
  t: ReturnType<typeof useTranslations<'PluginsPage'>>,
): string {
  if (!listing.allowUserOverride) {
    return listing.orgEnabled ? t('orgReadOnlyForced') : t('orgReadOnlyBlocked')
  }
  return listing.orgEnabled ? t('orgReadOnlyOnOptional') : t('orgReadOnlyOffOptional')
}
