'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePluginTranslations } from '../../sdk/messages'
import { useMarkers } from '../markers'

import type { LegendRow } from '../../sdk/types'

/**
 * One row per marker: its name and its colour, so the legend reads as a key to what is on
 * the map rather than a tally of colours.
 *
 * A hook, not a component: the host calls it while rendering the shared legend card, which
 * is what keeps it live as markers are added, renamed and recoloured. Returning
 * `active: false` while there are none keeps the card off the map entirely.
 *
 * Every marker gets a row. The host's card caps its body at 40vh and scrolls, so a long
 * list cannot cover the map.
 */
export function useMarkersLegend(): { active: boolean; title?: string; rows: LegendRow[] } {
  const t = usePluginTranslations()
  const { markers } = useMarkers()

  const rows: LegendRow[] = markers.map(marker => ({
    label: marker.name,
    color: marker.colour,
  }))

  return {
    active: rows.length > 0,
    title: t('legendTitle', 'Markers'),
    rows,
  }
}
