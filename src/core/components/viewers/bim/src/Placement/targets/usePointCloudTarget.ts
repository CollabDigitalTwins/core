'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useFile } from '../../../../../../hooks/files/files'
import { readPlacement } from '../../PointClouds/pointCloudPlacementStore'

import { pointCloudTarget } from './pointCloudTarget'

import type { DbFile } from '../../../../../../types/dbTypes'
import type { BimPointClouds } from '../../PointClouds'
import type { PlacementTarget } from '../placementTarget'

/**
 * Builds a point-cloud placement target and owns its persistence: keys `useFile` to whichever
 * cloud is being placed.
 */
export function usePointCloudTarget() {
  const [movingId, setMovingId] = React.useState<number | null>(null)
  const { updateFile } = useFile(movingId)
  const updateFileRef = React.useRef(updateFile)
  React.useEffect(() => { updateFileRef.current = updateFile }, [updateFile])

  const targetFor = React.useCallback((file: DbFile, clouds: BimPointClouds): PlacementTarget => {
    setMovingId(file.id)
    const id = String(file.id)
    const name = file.name ?? id

    return pointCloudTarget({
      id,
      name,
      clouds,
      storedPlacement: () => readPlacement(file),
      updateFile: async (patch) => {
        await updateFileRef.current(patch as never)
        Object.assign(file, patch)
      },
    })
  }, [])

  const clearMoving = React.useCallback(() => setMovingId(null), [])

  return { targetFor, clearMoving }
}
