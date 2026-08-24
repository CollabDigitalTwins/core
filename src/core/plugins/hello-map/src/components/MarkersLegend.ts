'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePluginTranslations } from '@collabdt/core/plugins-sdk/messages'

import { useMarkers } from '../markers'

import type { LegendRow } from '@collabdt/plugin-kit/types/legend'

/**
 * One row per marker, live as they are added, renamed and recoloured. Every marker gets a row;
 * the host's card caps its body at 40vh and scrolls.
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
