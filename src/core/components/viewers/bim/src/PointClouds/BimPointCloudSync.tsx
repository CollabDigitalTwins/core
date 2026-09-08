'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useFilesByBuildingId } from '../../../../../hooks/files/files'
import { BimContext } from '../../../../../store/BIM/context'
import { BuildingsContext } from '../../../../../store/Buildings/context'
import { resolvePointCloudApiBase } from '../../../shared/pointcloud/pointCloudApi'
import { createHttpPointCloudSource } from '../../../shared/pointcloud/pointCloudSource'
import { BimMeasurementManager } from '../BimMeasurements/BimMeasurementManager'

import { PlacementEditor } from '../Placement/PlacementEditor'

import { isRenderablePointCloud } from './pointCloudFiles'
import { readPlacement } from './pointCloudPlacementStore'

import { BimPointClouds } from './index'

import type { DbFile } from '../../../../../types/dbTypes'

/** Reconciles `pointCloudIds` into `BimPointClouds`, loading each cloud at its stored placement.
 *  Viewer-lifetime, so a panel closing cannot drop a cloud. Renders nothing. */
export function BimPointCloudSync({ pointcloudApiUrl }: { pointcloudApiUrl?: string }) {
  const { state, dispatch } = React.useContext(BimContext)
  const { bimComponents, world, pointCloudIds } = state.bim

  const { state: buildingState } = React.useContext(BuildingsContext)
  const buildingId = buildingState.buildings.building?.id ?? 0
  const { files, isLoading: filesLoading } = useFilesByBuildingId(buildingId)

  // Read through a ref so a file refetch cannot re-run the reconcile effect below.
  const fileOfRef = React.useRef((_id: string): DbFile | undefined => undefined)
  React.useEffect(() => {
    fileOfRef.current = (id: string) => files?.find((file) => String(file.id) === id)
  }, [files])


  // Claimed per building so a file refetch cannot re-add a cloud the user just switched off.
  const seededBuildingRef = React.useRef<number | null>(null)
  React.useEffect(() => {
    if (filesLoading || !files || files.length === 0) return
    if (seededBuildingRef.current === buildingId) return
    seededBuildingRef.current = buildingId

    const visible = files
      .filter(file => isRenderablePointCloud(file) && file.isVisible === true)
      .map(file => String(file.id))
    if (visible.length > 0) dispatch({ type: 'SET_POINT_CLOUD_IDS', payload: { pointCloudIds: visible } })
  }, [buildingId, files, filesLoading, dispatch])

  React.useEffect(() => {
    if (!bimComponents || !world) return
    const clouds = bimComponents.get(BimPointClouds)
    clouds.setup({
      world,
      source: createHttpPointCloudSource(resolvePointCloudApiBase(pointcloudApiUrl)),
    })
    // Clouds are invisible to the fragment raycaster, so the pivot pick needs them offered.
    bimComponents.get(PlacementEditor).setup({ world, pickSources: () => [clouds] })

    const measurements = bimComponents.get(BimMeasurementManager)
    measurements.registerPickSource(clouds)
    return () => measurements.unregisterPickSource(clouds)
  }, [bimComponents, world, pointcloudApiUrl])

  // Waits for the file records, so a cloud is never added at the default placement first.
  React.useEffect(() => {
    if (!bimComponents || !world || filesLoading) return
    const clouds = bimComponents.get(BimPointClouds)

    for (const id of clouds.ids()) {
      if (!pointCloudIds.includes(id)) clouds.remove(id)
    }

    for (const id of pointCloudIds) {
      if (clouds.get(id)) continue
      void clouds.add(id, readPlacement(fileOfRef.current(id))).catch((error) => {
        console.warn(`[point cloud ${id}] could not be loaded:`, error)
        dispatch({ type: 'TOGGLE_POINT_CLOUD', payload: { pointCloudId: id } })
      })
    }
  }, [bimComponents, world, pointCloudIds, pointcloudApiUrl, filesLoading, dispatch])

  return null
}
