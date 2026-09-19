'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useFile } from '../../../../../../hooks/files/files'
import { readSplatPlacement } from '../../Splats/splatPlacementStore'

import { splatTarget } from './splatTarget'

import type { DbFile } from '../../../../../../types/dbTypes'
import type { BimSplats } from '../../Splats'
import type { PlacementTarget } from '../placementTarget'

/**
 * Builds a splat placement target and owns its persistence: keys `useFile` to whichever
 * splat is being placed.
 */
export function useSplatTarget() {
  const [movingId, setMovingId] = React.useState<number | null>(null)
  const { updateFile } = useFile(movingId)
  const updateFileRef = React.useRef(updateFile)
  React.useEffect(() => { updateFileRef.current = updateFile }, [updateFile])

  const targetFor = React.useCallback((file: DbFile, splats: BimSplats): PlacementTarget => {
    setMovingId(file.id)
    const id = String(file.id)
    const name = file.name ?? id

    return splatTarget({
      id,
      name,
      splats,
      storedPlacement: () => readSplatPlacement(file),
      updateFile: async (patch) => {
        await updateFileRef.current(patch as never)
        Object.assign(file, patch)
      },
    })
  }, [])

  const clearMoving = React.useCallback(() => setMovingId(null), [])

  return { targetFor, clearMoving }
}
