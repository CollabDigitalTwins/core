'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePluginDialogs } from '../../sdk/ui'
import { useMarkers } from '../markers'

import type { DataPageColumn, DataPageRows } from '../../sdk/types'
import type { Marker } from '../markers'

/** Rows and the click handler both need hooks, so both come from here. */
export function useMarkerRows(): DataPageRows<Marker> {
  const { markers, isLoading, select, open } = useMarkers()
  const { open: openDialog } = usePluginDialogs()

  return {
    rows: markers,
    isLoading,
    onRowClick: (row) => {
      select(row.key)
      open(row.key)
      openDialog('detail', { markerKey: row.key })
    },
  }
}

// `labelKey` falls back to the literal, so this reads before any translation exists.
export const markerColumns: DataPageColumn<Marker>[] = [
  {
    key: 'colour',
    labelKey: 'colour',
    render: row => (
      <span
        aria-label={row.colour}
        className="inline-block h-3 w-3 rounded-full border border-white"
        style={{ backgroundColor: row.colour }}
      />
    ),
  },
  { key: 'name', labelKey: 'columnName' },
  { key: 'latitude', labelKey: 'columnLatitude', render: row => row.latitude.toFixed(5) },
  { key: 'longitude', labelKey: 'columnLongitude', render: row => row.longitude.toFixed(5) },
  { key: 'zoom', labelKey: 'zoom', render: row => row.zoom.toFixed(2) },
]
