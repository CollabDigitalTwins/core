'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Checkbox } from '../../../ui/Checkbox'

import { USER_CHOICE_KEY } from './PluginDetails'
import { Dash } from './PluginRow'
import { effectiveStatus, userChoice } from './pluginStatus'

import type { PluginListing, PluginsAbility } from '../types'

/** Added to the organization or not. Ticking opens the expanded row, where the trust prompt is. */
export function InstallQuickControl({
  listing,
  ability,
  name,
  onSetInstalled,
  onReview,
}: {
  listing?: PluginListing
  ability: PluginsAbility
  name: string
  onSetInstalled: (installed: boolean) => void
  onReview: () => void
}) {
  const t = useTranslations('PluginsPage')
  if (!listing) return <Dash />

  return (
    <Checkbox
      checked={listing.installed}
      disabled={!ability.canInstall}
      onCheckedChange={checked => (checked === true ? onReview() : onSetInstalled(false))}
      aria-label={t('quickInstalled', { name })}
      title={t('quickInstalled', { name })}
    />
  )
}

/** The organization's default on a collapsed row; nothing to switch until the plugin is added. */
export function OrgQuickControl({
  listing,
  ability,
  name,
  onSetOrgEnabled,
}: {
  listing?: PluginListing
  ability: PluginsAbility
  name: string
  onSetOrgEnabled: (enabled: boolean) => void
}) {
  const t = useTranslations('PluginsPage')
  if (!listing || effectiveStatus(listing) === 'available') return <Dash />

  return (
    <Checkbox
      checked={listing.orgEnabled}
      disabled={!ability.canConfigureOrg}
      onCheckedChange={checked => onSetOrgEnabled(checked === true)}
      aria-label={t('quickOrgEnabled', { name })}
      title={t('quickOrgEnabled', { name })}
    />
  )
}

/** The viewer's own switch on a collapsed row, or a disabled box that says why they have none. */
export function UserQuickControl({
  listing,
  ability,
  name,
  onSetUserEnabled,
}: {
  listing?: PluginListing
  ability: PluginsAbility
  name: string
  onSetUserEnabled: (enabled: boolean) => void
}) {
  const t = useTranslations('PluginsPage')
  if (!listing || effectiveStatus(listing) === 'available') return <Dash />

  const choice = userChoice(listing, ability)
  if (choice === 'nothingToRun') return <Dash />

  if (choice === 'choose') {
    return (
      <Checkbox
        checked={listing.userEnabled ?? listing.orgEnabled}
        onCheckedChange={checked => onSetUserEnabled(checked === true)}
        aria-label={t('quickUserRun', { name })}
        title={t('quickUserRun', { name })}
      />
    )
  }

  const reason = t(USER_CHOICE_KEY[choice])
  return <Checkbox checked={effectiveStatus(listing) === 'running'} disabled aria-label={t('quickUserRun', { name })} title={reason} />
}
