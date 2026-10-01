// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { effectiveStatus } from './pluginStatus'

import type { PluginColumn } from './pluginColumns'
import type { PluginRowData } from './pluginRows'
import type { PluginStatus } from '../types'

export type SortKey = Extract<PluginColumn, 'name' | 'status' | 'run' | 'install' | 'enable' | 'visibleTo'>
export type SortDirection = 'asc' | 'desc'
export interface PluginSort {
  key: SortKey
  direction: SortDirection
}

export const SORT_KEYS: readonly SortKey[] = ['name', 'status', 'run', 'install', 'enable', 'visibleTo']

const STATUS_RANK: Record<PluginStatus, number> = { running: 0, error: 1, off: 2, available: 3 }

export function rowName(row: PluginRowData): string {
  return row.listing?.manifest.name ?? row.entry?.name ?? row.slug
}

function sortValue(row: PluginRowData, key: SortKey): number | string {
  const { listing } = row
  switch (key) {
    case 'name': return rowName(row).toLowerCase()
    case 'status': return listing ? STATUS_RANK[effectiveStatus(listing)] : Object.keys(STATUS_RANK).length
    case 'run': return listing && effectiveStatus(listing) === 'running' ? 1 : 0
    case 'install': return listing?.installed ? 1 : 0
    case 'enable': return listing?.installed && listing.orgEnabled ? 1 : 0
    case 'visibleTo': return row.entry?.grants?.length ?? -1
  }
}

function compare(a: number | string, b: number | string): number {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b)
  return Number(a) - Number(b)
}

/** Sorted copy; ties fall back to the name so the order never jumps between renders. */
export function sortPluginRows(rows: readonly PluginRowData[], sort: PluginSort | null): PluginRowData[] {
  if (!sort) return [...rows]
  const sign = sort.direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) =>
    sign * compare(sortValue(a, sort.key), sortValue(b, sort.key))
    || compare(sortValue(a, 'name'), sortValue(b, 'name')))
}

/** Header clicks cycle ascending, descending, then back to unsorted. */
export function nextSort(current: PluginSort | null, key: SortKey): PluginSort | null {
  if (current?.key !== key) return { key, direction: 'asc' }
  return current.direction === 'asc' ? { key, direction: 'desc' } : null
}
