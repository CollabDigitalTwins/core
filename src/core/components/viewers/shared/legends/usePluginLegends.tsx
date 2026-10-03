'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { usePluginConfigs, usePluginContributions } from '../../../../plugins/host/provider'

import { legendKey, PluginLegendSection } from './PluginLegendSection'

import type { LegendContribution } from './PluginLegendSection'
import type { ViewerNames } from '../../../../types/dbTypes'

export interface PluginLegends {
  registrations: LegendContribution[]
  configs: Record<string, Record<string, unknown>>
  isActive: (registration: LegendContribution) => boolean
  /** Render once: keeps every legend's hook running, and its `active` known, while no card shows it. */
  probes: React.ReactNode
}

/** The `viewer.legends` that belong in `viewer`, and which of them currently have something to say. */
export function usePluginLegends(viewer: ViewerNames): PluginLegends {
  const all = usePluginContributions('viewer.legends')
  const configs = usePluginConfigs()

  const registrations = React.useMemo(
    () => all.filter(entry => !entry.viewers || entry.viewers.includes(viewer)),
    [all, viewer],
  )

  const [activeMap, setActiveMap] = React.useState<Record<string, boolean>>({})

  const reportActive = React.useCallback((key: string, active: boolean) => {
    setActiveMap(previous => (previous[key] === active ? previous : { ...previous, [key]: active }))
  }, [])

  const isActive = React.useCallback(
    (registration: LegendContribution) => Boolean(activeMap[legendKey(registration)]),
    [activeMap],
  )

  const probes = (
    <div className="hidden">
      {registrations.map(registration => (
        <PluginLegendSection
          key={`probe-${legendKey(registration)}`}
          registration={registration}
          config={configs[registration.pluginId]}
          onActiveChange={reportActive}
          renderBody={false}
        />
      ))}
    </div>
  )

  return { registrations, configs, isActive, probes }
}
