// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { PluginsAbility } from '../types'

export type PluginColumn = 'name' | 'version' | 'status' | 'run' | 'install' | 'enable' | 'visibleTo' | 'registry'

/** The columns holding a per-row control rather than plain text. */
export type ControlColumn = Extract<PluginColumn, 'run' | 'install' | 'enable' | 'visibleTo'>

const WIDTH: Record<PluginColumn, string> = {
  name: 'minmax(12rem,1fr)',
  version: '5rem',
  status: '10rem',
  run: '3.5rem',
  install: '4.5rem',
  enable: '4rem',
  visibleTo: '6rem',
  registry: '12rem',
}

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
  return columns.map(column => WIDTH[column]).join(' ')
}
