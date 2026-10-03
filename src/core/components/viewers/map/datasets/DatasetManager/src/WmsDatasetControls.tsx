'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { WmsTimeControl } from '../../../src/MapLayers/src/OpenDataLayer/src/WmsTimeControl'
import { getWmsActiveTime, setWmsActiveTime } from '../../src/wmsActiveTime'
import { fetchWmsFrames, wmsLegendUrl } from '../../src/wmsTime'

import type { Dataset } from '../../../../../../types/datasetTypes'

export const hasWmsTimeControl = (dataset: Dataset): boolean =>
  Boolean(dataset.timeEnabled && dataset.wms)

/** A time-enabled WMS dataset's scrubber and legend, nested under its row in the applied-layers card. */
export function WmsDatasetControls({ dataset }: { dataset: Dataset }) {
  const [frames, setFrames] = React.useState<string[]>([])
  const baseUrl = dataset.wms?.baseUrl
  const layers = dataset.wms?.layers

  React.useEffect(() => {
    if (!baseUrl || !layers) return
    let cancelled = false
    fetchWmsFrames(baseUrl, layers)
      .then(loaded => { if (!cancelled) setFrames(loaded) })
      .catch(() => { /* fetchWmsFrames already swallows; keep static */ })
    return () => { cancelled = true }
  }, [baseUrl, layers])

  const onTimeChange = React.useCallback(
    (time: string) => setWmsActiveTime(dataset.name, time),
    [dataset.name],
  )

  if (!baseUrl || !layers || frames.length < 2) return null

  return (
    <WmsTimeControl
      frames={frames}
      onTimeChange={onTimeChange}
      initialTime={getWmsActiveTime(dataset.name)}
      legendUrl={wmsLegendUrl(baseUrl, layers)}
    />
  )
}
