'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import * as THREE from 'three'

// Utilities
import { BimContext, BuildingsContext } from '../../../../../store'
import { ShareToolSubmenu } from '../../../../ui/ShareFeature'
import { withBimCameraParams } from '../../utils/setCameraLookAt'

import type { Tool } from '../../../../../types/tools'

// Custom components

interface ShareToolProps {
  tool: Tool
}

export const ShareBimTool: React.FC<ShareToolProps> = ({ tool }) => {
  const { state: bimState } = React.useContext(BimContext)

  const { state: buildingState } = React.useContext(BuildingsContext)
  const { building } = buildingState.buildings

  const { world, modelId } = bimState.bim

  const constructShareUrl = async (): Promise<string> => {
    const origin = window.location.origin
    const pathname = window.location.pathname

    if (world == null) {
      return origin + pathname
    }
    else {
      const position = new THREE.Vector3()
      const camPosition = world.camera.controls.getPosition(position) // THREE.PerspectiveCamera
      const target = new THREE.Vector3()
      const camTarget = world.camera.controls.getTarget(target) // THREE.PerspectiveCamera

      const shared = withBimCameraParams(new URLSearchParams(window.location.search), camPosition, camTarget)
      shared.set('viewer', 'bim')
      if (building) {
        shared.set('buildingId', String(building.id))
      }

      return `${origin}${pathname}?${shared.toString()}`
    }
  }

  return (
    <ShareToolSubmenu
      tool={tool}
      constructShareUrl={constructShareUrl}
      translationKey="ShareTool"
      dialogTitleKey="bim"
    />
  )
}