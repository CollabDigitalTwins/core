'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { BimContext } from '../../../../../store/BIM/context'
import { resolvePointCloudApiBase } from '../../../shared/pointcloud/pointCloudApi'
import { createHttpPointCloudSource } from '../../../shared/pointcloud/pointCloudSource'

import { PointCloudAlignment } from './PointCloudAlignment'

import { BimPointClouds } from './index'

/** Reconciles `pointCloudIds` into `BimPointClouds`. Viewer-lifetime, so a panel closing cannot
 *  drop a cloud. Renders nothing. */
export function BimPointCloudSync({ pointcloudApiUrl }: { pointcloudApiUrl?: string }) {
  const { state, dispatch } = React.useContext(BimContext)
  const { bimComponents, world, pointCloudIds } = state.bim

  React.useEffect(() => {
    if (!bimComponents || !world) return
    bimComponents.get(BimPointClouds).setup({
      world,
      source: createHttpPointCloudSource(resolvePointCloudApiBase(pointcloudApiUrl)),
    })
    bimComponents.get(PointCloudAlignment).setup({ world })
  }, [bimComponents, world, pointcloudApiUrl])

  React.useEffect(() => {
    if (!bimComponents || !world) return
    const clouds = bimComponents.get(BimPointClouds)

    for (const id of clouds.ids()) {
      if (!pointCloudIds.includes(id)) clouds.remove(id)
    }

    for (const id of pointCloudIds) {
      if (clouds.get(id)) continue
      void clouds.add(id).catch((error) => {
        console.warn(`[point cloud ${id}] could not be loaded:`, error)
        dispatch({ type: 'TOGGLE_POINT_CLOUD', payload: { pointCloudId: id } })
      })
    }
  }, [bimComponents, world, pointCloudIds, pointcloudApiUrl, dispatch])

  return null
}
