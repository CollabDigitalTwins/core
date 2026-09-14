'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useFilesByBuildingId } from '../../../../../hooks/files/files'
import { BimContext } from '../../../../../store/BIM/context'
import { BuildingsContext } from '../../../../../store/Buildings/context'
import { isSplatFile } from '../../../shared/splat/splatFiles'
import { BimMeasurementManager } from '../BimMeasurements/BimMeasurementManager'
import { PlacementEditor } from '../Placement/PlacementEditor'

import { readSplatPlacement } from './splatPlacementStore'

import { BimSplats } from './index'

import type { DbFile } from '../../../../../types/dbTypes'

/** Reconciles `splatIds` into `BimSplats`, loading each splat at its stored placement.
 *  Viewer-lifetime, so a panel closing cannot drop a splat. Renders nothing. */
export function BimSplatSync() {
  const { state, dispatch } = React.useContext(BimContext)
  const { bimComponents, world, splatIds } = state.bim

  const { state: buildingState } = React.useContext(BuildingsContext)
  const buildingId = buildingState.buildings.building?.id ?? 0
  const { files, isLoading: filesLoading } = useFilesByBuildingId(buildingId)

  // Read through a ref so a file refetch cannot re-run the reconcile effect below.
  const fileOfRef = React.useRef((_id: string): DbFile | undefined => undefined)
  React.useEffect(() => {
    fileOfRef.current = (id: string) => files?.find((file) => String(file.id) === id)
  }, [files])

  // Claimed per building so a file refetch cannot re-add a splat the user just switched off.
  const seededBuildingRef = React.useRef<number | null>(null)
  React.useEffect(() => {
    if (filesLoading || !files || files.length === 0) return
    if (seededBuildingRef.current === buildingId) return
    seededBuildingRef.current = buildingId

    const visible = files
      .filter(file => isSplatFile(file) && file.isVisible === true)
      .map(file => String(file.id))
    dispatch({ type: 'SET_SPLAT_IDS', payload: { splatIds: visible } })
  }, [buildingId, files, filesLoading, dispatch])

  React.useEffect(() => {
    if (!bimComponents || !world) return
    const splats = bimComponents.get(BimSplats)
    splats.setup({ world })

    // Splats are invisible to the fragment raycaster, so both tools need them offered.
    const editor = bimComponents.get(PlacementEditor)
    editor.registerPickSource(splats)

    const measurements = bimComponents.get(BimMeasurementManager)
    measurements.registerPickSource(splats)

    return () => {
      editor.unregisterPickSource(splats)
      measurements.unregisterPickSource(splats)
    }
  }, [bimComponents, world])

  // Waits for the file records, so a splat is never added at the default placement first.
  React.useEffect(() => {
    if (!bimComponents || !world || filesLoading) return
    const splats = bimComponents.get(BimSplats)

    for (const id of splats.ids()) {
      if (!splatIds.includes(id)) splats.remove(id)
    }

    for (const id of splatIds) {
      if (splats.get(id)) continue
      void splats.add(id, readSplatPlacement(fileOfRef.current(id))).catch((error) => {
        console.warn(`[splat ${id}] could not be loaded:`, error)
        dispatch({ type: 'TOGGLE_SPLAT', payload: { splatId: id } })
      })
    }
  }, [bimComponents, world, splatIds, filesLoading, dispatch])

  return null
}
