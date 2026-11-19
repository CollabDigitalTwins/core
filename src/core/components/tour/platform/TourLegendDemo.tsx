'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { LegendCard } from '../../ui/LegendCard'

import { TOUR_LEGEND_DEMO_TARGET, useTourDemo } from './tourDemos'

const SECTIONS = [
  { id: 'age', swatches: [['before1950', '#7f3b08'], ['from1950', '#e08214'], ['after1990', '#fdb863']] },
  { id: 'temperature', swatches: [['cold', '#2166ac'], ['mild', '#f7f7f7'], ['warm', '#b2182b']] },
] as const

/** The example legend the platform tour opens on the map, so a person sees one before any layer of theirs has one. */
export function TourLegendDemo() {
  const t = useTranslations('PlatformTour.legendDemo')
  if (!useTourDemo('legend')) return null
  return (
    <div data-tour={TOUR_LEGEND_DEMO_TARGET}>
      <LegendCard title={t('title')} count={SECTIONS.length}>
        {SECTIONS.map(section => (
          <div key={section.id} className="px-3 py-2">
            <p className="mb-1.5 text-xs font-medium">{t(`${section.id}.title`)}</p>
            <ul className="space-y-1">
              {section.swatches.map(([key, colour]) => (
                <li key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-3 w-3 shrink-0 rounded-sm border" style={{ background: colour }} />
                  {t(`${section.id}.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </LegendCard>
    </div>
  )
}
