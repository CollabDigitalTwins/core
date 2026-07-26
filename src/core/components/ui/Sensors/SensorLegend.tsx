'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useSensors } from '../../../hooks/sensors/sensors'
import { useSensorTypes } from '../../../hooks/sensorTypes/sensorTypes'
import { MenusContext } from '../../../store'
import { LegendCard } from '../LegendCard'

import { observedDomain, rampStops, resolveDomain, resolveRamp, valueOffset } from './sensorColour'
import { useSensorSeries } from './useSensorSeries'

import type { ViewerNames } from '../../../types/dbTypes'

const format = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

/** `Air_Quality` reads as `Air Quality`, matching how the cards title a type. */
const typeLabel = (name: string): string => name.replace(/_/g, ' ')

/**
 * Colour legend for the focused sensor's type, shown in a viewer's bottom-left card stack.
 *
 * This is what makes the value ramp readable: it puts the domain's numbers next to the colours
 * used by the marker halos and the chart fill, so nothing in the scene is encoded by colour
 * alone. Renders nothing unless a sensor is focused and its type has a usable colour domain, so
 * an unconfigured type shows no legend rather than a meaningless gradient.
 */
export function SensorLegend(): React.ReactElement | null {
  const t = useTranslations('SensorLegend')
  const { state } = React.useContext(MenusContext)
  const { focusedSensorId, currentSensorId, currentViewer } = state.menus

  const { sensors } = useSensors()
  const { sensorTypes } = useSensorTypes()

  // A click-focused sensor wins; hover is the fallback so the legend still explains the colours
  // while the pointer sweeps the scene.
  const activeId = focusedSensorId ?? currentSensorId
  const sensor = activeId == null ? undefined : sensors.find(s => s.id === activeId)
  const sensorType = sensor ? sensorTypes.find(ty => ty.id === sensor.typeId) : undefined

  const { points, unit, valueLabels } = useSensorSeries(
    sensor?.url ?? '',
    sensor?.dataFormat ?? 'Json',
    sensor?.updateFrequency ?? 0,
    { enabled: !!sensor?.url },
  )

  const ramp = resolveRamp(sensorType)
  const domain = resolveDomain(sensorType, observedDomain(points))

  const sameType = sensors.filter(
    s => s.typeId != null && s.typeId === sensor?.typeId && s.viewer === (currentViewer as ViewerNames),
  )

  if (!sensor || !sensorType || !domain) return null

  const latest = points[points.length - 1]?.value
  const hasReading = typeof latest === 'number' && Number.isFinite(latest)
  const gradient = `linear-gradient(to right, ${rampStops(ramp)
    .map(s => `${s.colour} ${s.offset * 100}%`)
    .join(', ')})`
  const [low, mid, high] = [domain.min, (domain.min + domain.max) / 2, domain.max]

  const readingText = hasReading
    ? valueLabels?.[latest] ?? `${format.format(latest)}${unit ? ` ${unit}` : ''}`
    : t('noReading')

  return (
    <LegendCard
      title={typeLabel(String(sensorType.name))}
      count={sameType.length}
      testId="sensor-legend-card"
      countTestId="sensor-legend-count"
    >
      <div className="px-3 py-2">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">{sensor.name}</span>
          <span className="shrink-0 text-xs font-medium tabular-nums">{readingText}</span>
        </div>

        <div className="relative">
          {/* Caret sits above the ramp at the current value. */}
          <div className="relative h-2">
            {hasReading && (
              <div
                data-testid="sensor-legend-caret"
                className="absolute top-0 -translate-x-1/2"
                style={{ left: `${valueOffset(latest, domain) * 100}%` }}
              >
                <div className="h-2 w-0.5 rounded-full bg-foreground" />
              </div>
            )}
          </div>
          <div
            data-testid="sensor-legend-ramp"
            aria-hidden="true"
            className="h-2.5 w-full rounded-full"
            style={{ background: gradient }}
          />
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
            <span>{format.format(low)}</span>
            <span>{format.format(mid)}</span>
            <span>{format.format(high)}</span>
          </div>
        </div>
      </div>
    </LegendCard>
  )
}
