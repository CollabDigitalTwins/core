'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useFile } from '../../../../../../hooks/files/files'
import { BimContext } from '../../../../../../store'
import { FloorplanTool } from '../../FloorplanTool'
import { ModelPlacementWatchers } from '../../lib/modelPlacementWatchers'

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
  const { state } = React.useContext(BimContext)
  const componentsRef = React.useRef(state.bim.bimComponents)
  componentsRef.current = state.bim.bimComponents
  const updateFileRef = React.useRef(updateFile)
  React.useEffect(() => { updateFileRef.current = updateFile }, [updateFile])

  const targetFor = React.useCallback(
    (
      file: DbFile,
      object: () => THREE.Object3D | null,
      capabilities?: PlacementCapabilities,
    ): PlacementTarget => {
      setMovingId(file.id)
      let before = object()?.matrixWorld.clone() ?? null

      return objectTarget({
        id: String(file.id),
        name: file.name,
        object,
        capabilities,
        confirmCommit: async (next, previous) =>
          next.rotation[1] === previous.rotation[1] ||
          (await componentsRef.current?.get(ModelPlacementWatchers).confirmTurn(file.name)) !== false,
        updateFile: async (patch) => {
          // Keeps the row in step, so it does not flicker back before the refetch lands.
          Object.assign(file, patch)
          await updateFileRef.current(patch as never)
          const after = object()?.matrixWorld.clone()
          const components = componentsRef.current
          if (!before || !after || !components || before.equals(after)) return
          // Floorplans and their room overlay are baked from the model's pose when projected.
          await components.get(FloorplanTool).refreshModel(file.name)
          await components.get(ModelPlacementWatchers).notify(file.name, before, after)
          before = after
        },
      })
    },
    [],
  )

  const clearMoving = React.useCallback(() => setMovingId(null), [])

  return { targetFor, clearMoving }
}
