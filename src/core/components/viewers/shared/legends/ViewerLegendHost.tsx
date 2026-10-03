'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { LegendCard } from '../../../ui/LegendCard'

import { legendKey, PluginLegendSection } from './PluginLegendSection'
import { usePluginLegends } from './usePluginLegends'

import type { ViewerNames } from '../../../../types/dbTypes'

/**
 * One shared legend card per viewer, with a titled section per active `viewer.legends`
 * registration. The map stacks its legends in the applied-layers card instead.
 */
export function ViewerLegendHost({ viewer }: { viewer: ViewerNames }) {
  const t = useTranslations('MapLegend')
  const { registrations, configs, isActive, probes } = usePluginLegends(viewer)

  const activeCount = registrations.filter(isActive).length

  return (
    <>
      {probes}

      {activeCount > 0 && (
        <LegendCard
          title={activeCount === 1 ? t('title') : t('titlePlural')}
          count={activeCount}
          testId="map-legend-card"
          countTestId="map-legend-count"
        >
          {registrations.map(registration => (
            <PluginLegendSection
              key={legendKey(registration)}
              registration={registration}
              config={configs[registration.pluginId]}
            />
          ))}
        </LegendCard>
      )}
    </>
  )
}
