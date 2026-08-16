'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePluginDialogs } from '../../sdk/ui'
import { usePicks } from '../picks'

import type { DataPageColumn, DataPageRows } from '../../sdk/types'
import type { Pick } from '../picks'

/**
 * The page's rows, and what a click on one does.
 *
 * Both come from here rather than from the registration because both need hooks: the rows
 * read the plugin's shared state, and the click opens the plugin's own dialog.
 */
export function usePickRows(): DataPageRows<Pick> {
  const { picks, select } = usePicks()
  const { open } = usePluginDialogs()

  return {
    rows: picks,
    onRowClick: (row) => {
      select(row.key)
      open('detail', { pickKey: row.key })
    },
  }
}

// `labelKey` is resolved in this plugin's own namespace and falls back to the literal, so
// the page reads sensibly even before a translator reaches it.
export const pickColumns: DataPageColumn<Pick>[] = [
  { key: 'name', labelKey: 'columnName' },
  { key: 'latitude', labelKey: 'columnLatitude', render: row => row.latitude.toFixed(5) },
  { key: 'longitude', labelKey: 'columnLongitude', render: row => row.longitude.toFixed(5) },
]
