'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useFile } from '../../../../../../hooks/files/files'

import { objectTarget } from './objectTarget'

import type { DbFile } from '../../../../../../types/dbTypes'
import type { PlacementCapabilities, PlacementTarget } from '../placementTarget'
import type * as THREE from 'three'

/**
 * Builds a placement target for anything that is one `Object3D` backed by a file, and keys
 * `useFile` to it so the commit has an `updateFile`.
 */
export function useModelTarget() {
  const [movingId, setMovingId] = React.useState<number | null>(null)
  const { updateFile } = useFile(movingId)
  const updateFileRef = React.useRef(updateFile)
  React.useEffect(() => { updateFileRef.current = updateFile }, [updateFile])

  const targetFor = React.useCallback(
    (
      file: DbFile,
      object: () => THREE.Object3D | null,
      capabilities?: PlacementCapabilities,
    ): PlacementTarget => {
      setMovingId(file.id)

      return objectTarget({
        id: String(file.id),
        name: file.name,
        object,
        capabilities,
        updateFile: async (patch) => {
          // Keeps the row in step, so it does not flicker back before the refetch lands.
          Object.assign(file, patch)
          await updateFileRef.current(patch as never)
        },
      })
    },
    [],
  )

  const clearMoving = React.useCallback(() => setMovingId(null), [])

  return { targetFor, clearMoving }
}
