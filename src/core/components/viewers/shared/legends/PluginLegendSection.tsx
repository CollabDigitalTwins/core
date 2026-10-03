'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { PluginScopeProvider } from '../../../../plugins/host/scope'
import { Switch } from '../../../ui/Switch'

import type { PluginContribution } from '../../../../plugins/host/provider'
import type { LegendRegistration, LegendRow } from '../../../../plugins/sdk/types'

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
      <ul className="space-y-1">
        {rows.map(row => <LegendRowItem key={row.label} row={row} />)}
      </ul>
      {controls && <div className="mt-2">{controls}</div>}
    </div>
  )
}

function LegendRowItem({ row }: { row: LegendRow }) {
  const switchable = row.onVisibleChange !== undefined
  const visible = row.visible !== false

  return (
    <li className={`flex items-center gap-2 text-xs ${visible ? '' : 'opacity-50'}`}>
      <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: row.color }} />
      <span className="flex-1">{row.label}</span>
      {row.count !== undefined && <span className="tabular-nums opacity-70">{row.count}</span>}
      {switchable && (
        <Switch
          checked={visible}
          onCheckedChange={checked => row.onVisibleChange?.(checked)}
          aria-label={row.label}
        />
      )}
    </li>
  )
}
