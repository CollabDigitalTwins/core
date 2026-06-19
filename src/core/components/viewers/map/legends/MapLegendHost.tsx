'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import * as LR from 'lucide-react'
import { Menubar } from '../../../../components/ui/Menubar'
import { Command } from '../../../../components/ui/Command'
import { Badge } from '../../../../components/ui/Badge'
import { Button } from '../../../../components/ui/Button'
import { usePluginRegistry, usePluginsReady } from '../../../../plugins/host/provider'
import type { LegendRegistration } from '../../../../plugins/sdk/types'
import type { RegistryEntry } from '../../../../plugins/host/registry'

/**
 * Single shared legend card. Reads all `map.legends` registrations and renders
 * one DatasetManager-styled card (bottom-left, aligned with the layers/styling
 * card) with a titled section per
 * ACTIVE legend. Replaces the per-plugin floating legends and their hand-tuned
 * bottom-[Npx] offsets — sections auto-stack inside the one card.
 */
export function MapLegendHost() {
  const registry = usePluginRegistry()
  const ready = usePluginsReady()
  const [open, setOpen] = React.useState(true)
  const [activeMap, setActiveMap] = React.useState<Record<string, boolean>>({})

  const registrations = ready
    ? (registry.getAll('map.legends') as (RegistryEntry & LegendRegistration)[])
    : []

  const reportActive = React.useCallback((id: string, active: boolean) => {
    setActiveMap(prev => (prev[id] === active ? prev : { ...prev, [id]: active }))
  }, [])

  const activeCount = registrations.filter(r => activeMap[r.id]).length

  return (
    <>
      {/* Hidden probes keep useLegend() hooks alive even while the card is hidden. */}
      <div className="hidden">
        {registrations.map(r => (
          <LegendSection key={`probe-${r.id}`} registration={r} onActiveChange={reportActive} renderBody={false} />
        ))}
      </div>

      {activeCount > 0 && (
        <div data-testid="map-legend-card" className="pointer-events-auto">
          <Menubar className="w-72 h-auto">
            <Command>
              <div>
                <div className={`flex items-center justify-between gap-3 ${open ? 'p-3' : 'pl-1 py-0'}`}>
                  <div className="flex items-center gap-2">
                    <Badge data-testid="map-legend-count">{activeCount}</Badge>
                    <div className="text-sm font-medium">Legend{activeCount === 1 ? '' : 's'}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpen(o => !o)}
                    className="opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
                  >
                    <LR.ChevronUp size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
                {open && (
                  <div className="max-h-[40vh] overflow-y-auto pb-1">
                    {registrations.map(r => (
                      <LegendSection key={r.id} registration={r} onActiveChange={reportActive} renderBody />
                    ))}
                  </div>
                )}
              </div>
            </Command>
          </Menubar>
        </div>
      )}
    </>
  )
}

interface LegendSectionProps {
  registration: LegendRegistration
  onActiveChange: (id: string, active: boolean) => void
  renderBody: boolean
}

function LegendSection({ registration, onActiveChange, renderBody }: LegendSectionProps) {
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
          Feed unavailable
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
