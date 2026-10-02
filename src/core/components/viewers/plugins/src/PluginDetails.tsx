'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { usePluginMessage } from '../../../../plugins/sdk/messages'
import { Badge } from '../../../ui/Badge'
import { Button } from '../../../ui/Button'
import { Separator } from '../../../ui/Separator'
import { Switch } from '../../../ui/Switch'

import { effectiveStatus, userChoice } from './pluginStatus'

import type { UserChoice } from './pluginStatus'
import type { PluginListing, PluginsAbility } from '../types'
import type { LucideIcon } from 'lucide-react'

/** Why the viewer has no switch of their own; `choose` never reaches here. */
export const USER_CHOICE_KEY = {
  nothingToRun: 'userNothingToRun',
  readOnly: 'userReadOnly',
  lockedOn: 'userLockedOn',
  lockedOff: 'userLockedOff',
} as const satisfies Record<Exclude<UserChoice, 'choose'>, string>

// Read-only is not the admin lock: nothing is locked, this reader just may not change what runs.
const CHOICE_ICON: Record<Exclude<UserChoice, 'choose'>, LucideIcon> = {
  nothingToRun: LR.Minus,
  readOnly: LR.Eye,
  lockedOn: LR.Lock,
  lockedOff: LR.Lock,
}

// Which surface a capability contributes to: an icon reads faster than the dotted key.
const CAPABILITY_ICON: Record<string, LucideIcon> = {
  'map.tools': LR.Map,
  'viewer.legends': LR.SquareMenu,
  'map.layers': LR.Layers,
  'bim.tools': LR.Box,
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

/** The expanded half of a plugin row: what it is, and the organization's and the viewer's switches. */
export function PluginDetails({
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
  const status = effectiveStatus(listing)
  const description = usePluginMessage(manifest.slug, 'description', manifest.description ?? '')

  const isAdmin = ability.canConfigureOrg || ability.canInstall
  const choice = userChoice(listing, ability)
  const userEnabled = listing.userEnabled ?? listing.orgEnabled

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_270px]">
      <div className="min-w-0">
        {description && <p className="max-w-[60ch] text-sm">{description}</p>}

        <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          <code>{manifest.slug}</code>
          <span className="opacity-40">·</span>
          {manifest.author || t('unknownAuthor')}
          {listing.bundled && (
            <>
              <span className="opacity-40">·</span>
              {t('bundled')}
            </>
          )}
        </p>

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
              {listing.registryVersion && <li>{t('trustRegistry', { version: listing.registryVersion })}</li>}
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

      <div className="flex min-w-0 flex-col gap-2.5">
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
                <p className="py-1 text-sm text-muted-foreground">{orgSummary(listing, ability, t)}</p>
              </ControlGroup>
            )}

            <ControlGroup label={t('userGroup')}>
              {choice === 'choose' ? (
                <ControlRow label={t('userRun')}>
                  <Switch
                    checked={userEnabled}
                    onCheckedChange={onSetUserEnabled}
                    aria-label={t('userRun')}
                  />
                </ControlRow>
              ) : (
                <Note icon={CHOICE_ICON[choice]} text={t(USER_CHOICE_KEY[choice])} />
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
    </div>
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
  ability: PluginsAbility,
  t: ReturnType<typeof useTranslations<'PluginsPage'>>,
): string {
  if (!listing.allowUserOverride) {
    return listing.orgEnabled ? t('orgReadOnlyForced') : t('orgReadOnlyBlocked')
  }
  if (!ability.canChooseForSelf) {
    return listing.orgEnabled ? t('orgReadOnlyOnAskAdmin') : t('orgReadOnlyOffAskAdmin')
  }
  return listing.orgEnabled ? t('orgReadOnlyOnOptional') : t('orgReadOnlyOffOptional')
}
