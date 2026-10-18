'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { WmsTimeControl } from '../../../src/MapLayers/src/OpenDataLayer/src/WmsTimeControl'
import { getWmsActiveTime, setWmsActiveTime } from '../../src/wmsActiveTime'

import type { Dataset } from '../../../../../../types/datasetTypes'

const NO_FRAMES: string[] = []

export const hasWmsTimeControl = (dataset: Dataset): boolean =>
  Boolean(dataset.timeEnabled && dataset.wms)

/** A time-enabled WMS dataset's scrubber, nested under its row in the applied-layers card. */
export function WmsDatasetControls({ dataset }: { dataset: Dataset }) {
  const frames = dataset.wmsFrames ?? NO_FRAMES
  const onTimeChange = React.useCallback(
    (time: string) => setWmsActiveTime(dataset.name, time),
    [dataset.name],
  )

  if (!dataset.wms || frames.length < 2) return null

  return (
    <WmsTimeControl
      frames={frames}
      onTimeChange={onTimeChange}
      initialTime={getWmsActiveTime(dataset.name)}
    />
  )
}
