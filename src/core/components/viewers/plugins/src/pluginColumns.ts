// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { PluginsAbility } from '../types'

export type PluginColumn = 'name' | 'version' | 'status' | 'run' | 'install' | 'enable' | 'visibleTo' | 'registry'

/** The columns holding a per-row control rather than plain text. */
export type ControlColumn = Extract<PluginColumn, 'run' | 'install' | 'enable' | 'visibleTo'>

/** Each column's width in rem; `name` takes whatever is left above its minimum. */
const WIDTH_REM: Record<PluginColumn, number> = {
  name: 8,
  version: 5,
  status: 10,
  run: 3.5,
  install: 4.5,
  enable: 4,
  visibleTo: 6,
  registry: 12,
}

/** Matches `gap-3` in `PLUGIN_ROW_GRID`. */
const GAP_REM = 0.75

// Dropped first to last; each holds nothing the expanded details do not show again.
const DROP_ORDER: readonly PluginColumn[] = ['version', 'registry', 'visibleTo', 'enable', 'install', 'status']

/** Run is everyone's; Install and Enable are the organization admin's; Visible to is the platform admin's; Registry only matters beside a local copy. */
export function visibleColumns(ability: PluginsAbility, canGrant: boolean, hasLocalPlugins: boolean): PluginColumn[] {
  return [
    'name',
    'version',
    'status',
    'run',
    ...(ability.canInstall ? ['install' as const] : []),
    ...(ability.canConfigureOrg ? ['enable' as const] : []),
    ...(canGrant ? ['visibleTo' as const] : []),
    ...(hasLocalPlugins ? ['registry' as const] : []),
  ]
}

export function gridTemplate(columns: readonly PluginColumn[]): string {
  return columns.map(column => column === 'name' ? `minmax(${WIDTH_REM.name}rem,1fr)` : `${WIDTH_REM[column]}rem`).join(' ')
}

/** The narrowest a row of these columns can be, in rem, padding excluded. */
export function minRowWidth(columns: readonly PluginColumn[]): number {
  const widths = columns.reduce((total, column) => total + WIDTH_REM[column], 0)
  return widths + GAP_REM * Math.max(columns.length - 1, 0)
}

/** The columns that fit `availableRem`, so the table never scrolls sideways. A width of 0 means unmeasured. */
export function fitColumns(columns: readonly PluginColumn[], availableRem: number): PluginColumn[] {
  if (availableRem <= 0) return [...columns]

  let fitted = [...columns]
  for (const column of DROP_ORDER) {
    if (minRowWidth(fitted) <= availableRem) break
    fitted = fitted.filter(candidate => candidate !== column)
  }
  return fitted
}
