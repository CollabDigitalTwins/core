'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePluginTranslations } from '../../sdk/messages'
import { useSpaces } from '../spaces'

import type { LegendRow } from '../../sdk/types'

/**
 * One row per space, live as they are renamed and recoloured. The legend probe is mounted for
 * as long as the viewer, so this is also what discovers the model's spaces.
 */
export function useSpacesLegend(): { active: boolean; title?: string; rows: LegendRow[] } {
  const t = usePluginTranslations()
  const { spaces } = useSpaces()

  return {
    active: spaces.length > 0,
    title: t('legendTitle', 'Spaces'),
    rows: spaces.map<LegendRow>(space => ({ label: space.name, color: space.colour })),
  }
}
