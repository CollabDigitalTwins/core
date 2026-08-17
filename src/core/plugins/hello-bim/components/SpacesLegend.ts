'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePluginTranslations } from '../../sdk/messages'
import { useSpaces } from '../spaces'

import type { LegendRow } from '../../sdk/types'

/**
 * One row per space: its name and the colour it is painted.
 *
 * A hook, not a component: the host calls it while rendering the shared legend card, which
 * is what keeps it live as spaces are renamed and recoloured. It is also what discovers the
 * model's spaces in the first place — the legend's hidden probe is mounted for as long as
 * the viewer, so it runs before any panel is opened.
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
