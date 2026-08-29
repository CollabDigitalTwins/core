'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { BimContext } from '../../../../../store/BIM/context'

import { BimPointClouds } from './index'

import type { LoadedPointCloud } from '../../../shared/pointcloud/pointCloudRegistry'

/** Mirrors the clouds `BimPointClouds` actually holds into React state. It owns them; this reads. */
export function useBimPointClouds(): LoadedPointCloud[] {
  const { state } = React.useContext(BimContext)
  const { bimComponents } = state.bim
  const [clouds, setClouds] = React.useState<LoadedPointCloud[]>([])

  React.useEffect(() => {
    if (!bimComponents) {
      setClouds([])
      return
    }

    const component = bimComponents.get(BimPointClouds)
    const publish = () => setClouds(component.list())
    publish()

    component.onChanged.add(publish)
    return () => component.onChanged.remove(publish)
  }, [bimComponents])

  return clouds
}
