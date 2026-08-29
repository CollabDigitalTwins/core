'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { useFile, useFilesByBuildingId } from '../../../../../hooks/files/files'
import { BimContext } from '../../../../../store/BIM/context'
import { BuildingsContext } from '../../../../../store/Buildings/context'
import { resolvePointCloudApiBase } from '../../../shared/pointcloud/pointCloudApi'
import { createHttpPointCloudSource } from '../../../shared/pointcloud/pointCloudSource'
import { BimMeasurementManager } from '../BimMeasurements/BimMeasurementManager'

import { PointCloudAlignment } from './PointCloudAlignment'
import { placementPatch, readPlacement, samePlacement } from './pointCloudPlacementStore'

import { BimPointClouds } from './index'

import type { AlignmentState } from './PointCloudAlignment'
import type { DbFile } from '../../../../../types/dbTypes'

/** Reconciles `pointCloudIds` into `BimPointClouds` and carries placement to and from the file
 *  record. Viewer-lifetime, so a panel closing cannot drop a cloud. Renders nothing. */
export function BimPointCloudSync({ pointcloudApiUrl }: { pointcloudApiUrl?: string }) {
  const t = useTranslations('PointCloudAlignment')
  const { state, dispatch } = React.useContext(BimContext)
  const { bimComponents, world, pointCloudIds } = state.bim

  const { state: buildingState } = React.useContext(BuildingsContext)
  const { files, isLoading: filesLoading } = useFilesByBuildingId(buildingState.buildings.building?.id ?? 0)

  // Bound while a cloud is being aligned, so `updateFile` is already keyed to it on commit.
  const [aligningId, setAligningId] = React.useState<number | null>(null)
  const { updateFile } = useFile(aligningId)
  const updateFileRef = React.useRef(updateFile)
  React.useEffect(() => { updateFileRef.current = updateFile }, [updateFile])

  // Read through a ref so the alignment subscription below survives every file refetch.
  const fileOfRef = React.useRef((_id: string): DbFile | undefined => undefined)
  React.useEffect(() => {
    fileOfRef.current = (id: string) => files?.find((file) => String(file.id) === id)
  }, [files])

  const announceRef = React.useRef(t)
  React.useEffect(() => { announceRef.current = t }, [t])

  React.useEffect(() => {
    if (!bimComponents || !world) return
    const clouds = bimComponents.get(BimPointClouds)
    clouds.setup({
      world,
      source: createHttpPointCloudSource(resolvePointCloudApiBase(pointcloudApiUrl)),
    })
    bimComponents.get(PointCloudAlignment).setup({ world })

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

  React.useEffect(() => {
    if (!bimComponents || !world) return
    const alignment = bimComponents.get(PointCloudAlignment)

    const track = (session: AlignmentState | null) => setAligningId(session ? Number(session.id) : null)
    const persist = ({ id, placement }: AlignmentState) => {
      const file = fileOfRef.current(id)
      if (samePlacement(placement, readPlacement(file))) return

      const name = file?.name ?? id
      const announce = announceRef.current
      void Promise.resolve(updateFileRef.current(placementPatch(placement)))
        .then(() => toast.success(announce('saved', { name })))
        .catch((error: unknown) => {
          console.warn(`[point cloud ${id}] placement was not saved:`, error)
          toast.error(announce('saveFailed', { name }))
        })
    }

    alignment.onChanged.add(track)
    alignment.onCommitted.add(persist)
    return () => {
      alignment.onChanged.remove(track)
      alignment.onCommitted.remove(persist)
    }
  }, [bimComponents, world])

  return null
}
