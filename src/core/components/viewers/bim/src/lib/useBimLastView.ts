'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import * as THREE from 'three'

import { BimContext, BuildingsContext } from '../../../../../store'
import { rememberView } from '../../../shared/lastView/lastViewStore'
import { useLastViewScope } from '../../../shared/lastView/useLastViewScope'
import { withBimCameraParams } from '../../utils/setCameraLookAt'

/** Remembers where the BIM camera rests once the user has moved it, for the open building only. */
export function useBimLastView() {
  const scope = useLastViewScope()
  const { state: bimState } = React.useContext(BimContext)
  const { state: buildingsState } = React.useContext(BuildingsContext)
  const { world, fragments } = bimState.bim
  const controls = world?.camera?.controls
  const buildingId = buildingsState.buildings.building?.id

  React.useEffect(() => {
    if (!controls || !scope || buildingId === undefined) return
    let userMoved = false

    const onControlStart = () => { userMoved = true }
    const onRest = () => {
      const current = new URLSearchParams(window.location.search)
      const hasModels = (fragments?.core.models.list.size ?? 0) > 0
      if (!userMoved || !hasModels || current.get('buildingId') !== String(buildingId)) return
      rememberView(scope, 'bim', withBimCameraParams(current, controls.getPosition(new THREE.Vector3()), controls.getTarget(new THREE.Vector3())))
    }

    controls.addEventListener('controlstart', onControlStart)
    controls.addEventListener('rest', onRest)
    return () => {
      controls.removeEventListener('controlstart', onControlStart)
      controls.removeEventListener('rest', onRest)
    }
  }, [controls, scope, buildingId, fragments])
}
