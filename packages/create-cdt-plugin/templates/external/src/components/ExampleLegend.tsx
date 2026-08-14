// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePluginTranslations } from '@collabdt/core/plugins-sdk/messages'

import type { LegendRow } from '{{SURFACE_ENTRY}}'

// The platform calls this while rendering the map legend, so it is a hook and may use other
// hooks. That is what lets the rows carry live counts: read them from `usePluginStore` or
// from your own state here and they stay current.
//
// Returning `active: false` omits the section entirely, which is what a legend with nothing
// to say should do rather than rendering an empty box.
export function useLegend(): { active: boolean; title?: string; rows: LegendRow[] } {
  const t = usePluginTranslations()

  const rows: LegendRow[] = [
    { label: t('rowHigh', 'High'), color: '#b91c1c', count: 12 },
    { label: t('rowMedium', 'Medium'), color: '#c2410c', count: 34 },
    { label: t('rowLow', 'Low'), color: '#15803d', count: 56 },
  ]

  return { active: true, title: t('title', '{{NAME}}'), rows }
}
