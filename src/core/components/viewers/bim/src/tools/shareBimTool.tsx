'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import * as THREE from 'three'

// Utilities
import { BimContext, BuildingsContext } from '../../../../../store'
import { Tool } from '../../../../../types/tools'

// Custom components
import { ShareToolSubmenu } from '../../../../ui/ShareFeature'

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

      // Start with existing URL parameters from the current page
      const currentUrl = new URL(window.location.href)
      const params = new URLSearchParams(currentUrl.search)

      // Add/override BIM-specific parameters
      params.set('viewer', 'bim')
      params.set('camX', camPosition.x.toFixed(3) || '0')
      params.set('camY', camPosition.y.toFixed(3) || '0')
      params.set('camZ', camPosition.z.toFixed(3) || '0')
      params.set('tarX', camTarget.x.toFixed(3) || '0')
      params.set('tarY', camTarget.y.toFixed(3) || '0')
      params.set('tarZ', camTarget.z.toFixed(3) || '0')
      if (building) {
        params.set('buildingId', String(building.id))
      }

      const shareUrl = `${origin}${pathname}?${params.toString()}`
      return shareUrl
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