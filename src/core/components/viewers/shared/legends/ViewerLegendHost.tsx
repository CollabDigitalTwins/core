'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { usePluginConfigs, usePluginContributions } from '../../../../plugins/host/provider'
import { PluginScopeProvider } from '../../../../plugins/host/scope'
import { LegendCard } from '../../../ui/LegendCard'

import type { PluginContribution } from '../../../../plugins/host/provider'
import type { LegendRegistration } from '../../../../plugins/sdk/types'
import type { ViewerNames } from '../../../../types/dbTypes'

/**
 * One shared legend card per viewer, with a titled section per active `viewer.legends`
 * registration. Replaces the per-plugin floating legends and their hand-tuned offsets.
 */
export function ViewerLegendHost({ viewer }: { viewer: ViewerNames }) {
  const all = usePluginContributions('viewer.legends')
  const configs = usePluginConfigs()

  // A legend with no `viewers` belongs everywhere; one that names them appears only there.
  const registrations = React.useMemo(
    () => all.filter(entry => !entry.viewers || entry.viewers.includes(viewer)),
    [all, viewer],
  )
  const t = useTranslations('MapLegend')
  const [activeMap, setActiveMap] = React.useState<Record<string, boolean>>({})

  const reportActive = React.useCallback((id: string, active: boolean) => {
    setActiveMap(prev => (prev[id] === active ? prev : { ...prev, [id]: active }))
  }, [])

  const activeCount = registrations.filter(r => activeMap[r.id]).length

  return (
    <>
      {/* Hidden probes keep useLegend() hooks alive even while the card is hidden. */}
      <div className="hidden">
        {registrations.map(r => (
          <ScopedLegendSection
            key={`probe-${r.id}`}
            registration={r}
            config={configs[r.pluginId]}
            onActiveChange={reportActive}
            renderBody={false}
          />
        ))}
      </div>

      {activeCount > 0 && (
        <LegendCard
          title={activeCount === 1 ? t('title') : t('titlePlural')}
          count={activeCount}
          testId="map-legend-card"
          countTestId="map-legend-count"
        >
          {registrations.map(r => (
            <ScopedLegendSection
              key={r.id}
              registration={r}
              config={configs[r.pluginId]}
              onActiveChange={reportActive}
              renderBody
            />
          ))}
        </LegendCard>
      )}
    </>
  )
}

// The scope must be a parent: `useLegend` runs in LegendSection's own body.
function ScopedLegendSection({ registration, config, ...rest }: ScopedLegendSectionProps) {
  return (
    <PluginScopeProvider pluginId={registration.pluginId} config={config}>
      <LegendSection registration={registration} {...rest} />
    </PluginScopeProvider>
  )
}

interface ScopedLegendSectionProps extends LegendSectionProps {
  registration: PluginContribution<'viewer.legends'>
  config?: Record<string, unknown>
}

interface LegendSectionProps {
  registration: LegendRegistration
  onActiveChange: (id: string, active: boolean) => void
  renderBody: boolean
}

function LegendSection({ registration, onActiveChange, renderBody }: LegendSectionProps) {
  const t = useTranslations('MapLegend')
  const { active, title, unavailable, rows } = registration.useLegend()

  React.useEffect(() => {
    onActiveChange(registration.id, active)
  }, [active, registration.id, onActiveChange])

  if (!renderBody || !active) return null

  return (
    <div className="px-3 py-2 border-t first:border-t-0">
      <div className="font-semibold text-xs mb-1">{title ?? registration.title}</div>
      {unavailable ? (
        <div className="rounded bg-red-100 text-red-800 px-2 py-1 text-[11px] font-medium">
          {t('feedUnavailable')}
        </div>
      ) : (
        <ul className="space-y-1">
          {rows.map(row => (
            <li key={row.label} className="flex items-center gap-2 text-xs">
              <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: row.color }} />
              <span className="flex-1">{row.label}</span>
              {row.count !== undefined && <span className="tabular-nums opacity-70">{row.count}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
