"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useFile } from '../../../../../hooks/files/files'
import { capabilitiesForFile } from '../../../shared/placement/placementCapabilities'

import { mapPlacementTarget } from './mapPlacementTarget'

import type { MapAnchor } from './mapPlacementGeo'
import type { DbFile } from '../../../../../types/dbTypes'
import type { PlacementTarget } from '../../../shared/placement/placementTarget'
import type * as THREE from 'three'

export interface MapTargetSetup {
  file: DbFile
  object: () => THREE.Object3D | null
  anchor: () => MapAnchor
  preview: (anchor: MapAnchor, rotation: number, scale: number) => void
}

/** Binds a map file's row to a placement target, so a finished edit writes its geographic columns. */
export function useMapPlacementTarget() {
  const [movingId, setMovingId] = React.useState<number | null>(null)
  const { updateFile } = useFile(movingId)
  const updateFileRef = React.useRef(updateFile)
  React.useEffect(() => { updateFileRef.current = updateFile }, [updateFile])

  const targetFor = React.useCallback(
    ({ file, object, anchor, preview }: MapTargetSetup): PlacementTarget => {
      setMovingId(file.id)

      return mapPlacementTarget({
        id: String(file.id),
        name: file.name,
        object,
        anchor,
        preview,
        capabilities: capabilitiesForFile(file),
        updateFile: async (patch) => {
          // Keeps the row in step, so it does not flicker back before the refetch lands.
          Object.assign(file, patch)
          await updateFileRef.current(patch as never)
        },
      })
    },
    [],
  )

  return { targetFor }
}
