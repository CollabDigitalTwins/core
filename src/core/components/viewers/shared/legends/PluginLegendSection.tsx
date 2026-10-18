'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { PluginScopeProvider } from '../../../../plugins/host/scope'
import { LegendRows } from '../../../ui/LegendRows'
import { Switch } from '../../../ui/Switch'

import type { PluginContribution } from '../../../../plugins/host/provider'
import type { LegendRegistration, LegendRow } from '../../../../plugins/sdk/types'
import type { LegendRowEntry } from '../../../ui/LegendRows'

export type LegendContribution = PluginContribution<'viewer.legends'>

/** Identifies a legend across plugins, which may each reuse the same registration id. */
export const legendKey = (registration: LegendContribution) => `${registration.pluginId}:${registration.id}`

export interface PluginLegendSectionProps {
  registration: LegendContribution
  config?: Record<string, unknown>
  onActiveChange?: (key: string, active: boolean) => void
  /** False runs the legend's hook for its `active` report only, drawing nothing. */
  renderBody?: boolean
  /** Hides the title, for a legend nested under a row that already names it. */
  showTitle?: boolean
}

// The scope must be a parent: `useLegend` runs in LegendBody's own render.
export function PluginLegendSection({ registration, config, ...rest }: PluginLegendSectionProps) {
  return (
    <PluginScopeProvider pluginId={registration.pluginId} config={config}>
      <LegendBody registration={registration} {...rest} />
    </PluginScopeProvider>
  )
}

function LegendBody({ registration, onActiveChange, renderBody = true, showTitle = true }: PluginLegendSectionProps) {
  const t = useTranslations('MapLegend')
  const { active, title, unavailable, rows, controls } = (registration as LegendRegistration).useLegend()
  const key = legendKey(registration)

  React.useEffect(() => {
    onActiveChange?.(key, active)
  }, [active, key, onActiveChange])

  const shownTitle = title ?? registration.title
  React.useEffect(() => {
    if (active && unavailable) toast.warning(t('feedUnavailableToast', { title: shownTitle }), { id: `legend-unavailable-${key}` })
  }, [active, unavailable, key, shownTitle, t])

  if (!renderBody || !active) return null

  return (
    <div className="px-3 py-2 border-t first:border-t-0">
      {showTitle && <div className="font-semibold text-xs mb-1">{shownTitle}</div>}
      {unavailable && (
        <div className="mb-1 rounded bg-red-100 text-red-800 px-2 py-1 text-[11px] font-medium">
          {t('feedUnavailable')}
        </div>
      )}
      <LegendRows rows={rows.map(legendRowEntry)} className="space-y-1 text-xs" labelClassName="flex-1" />
      {controls && <div className="mt-2">{controls}</div>}
    </div>
  )
}

function legendRowEntry(row: LegendRow): LegendRowEntry {
  const visible = row.visible !== false
  const trailing = (
    <>
      {row.count !== undefined && <span className="tabular-nums opacity-70">{row.count}</span>}
      {row.onVisibleChange !== undefined && (
        <Switch
          checked={visible}
          onCheckedChange={checked => row.onVisibleChange?.(checked)}
          aria-label={row.label}
        />
      )}
    </>
  )
  return { label: row.label, swatch: row.color, trailing, dimmed: !visible }
}
