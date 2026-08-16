'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePluginConfig } from '../../sdk/config'
import { usePluginTranslations } from '../../sdk/messages'
import { usePicks } from '../picks'

import type { LegendRow } from '../../sdk/types'

interface Config extends Record<string, unknown> {
  colour?: string
}

/**
 * A hook, not a component: the host calls it while rendering the shared legend card, so the
 * count stays live. `active: false` while nothing is picked keeps the card out of the way.
 */
export function usePicksLegend(): { active: boolean; title?: string; rows: LegendRow[] } {
  const t = usePluginTranslations()
  const { colour = '#2563eb' } = usePluginConfig<Config>()
  const { picks } = usePicks()

  return {
    active: picks.length > 0,
    title: t('legendTitle', 'Picked points'),
    rows: [{ label: t('legendRow', 'Picked'), color: colour, count: picks.length }],
  }
}
