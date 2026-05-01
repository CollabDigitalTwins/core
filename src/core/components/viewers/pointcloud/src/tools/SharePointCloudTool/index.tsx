'use client'

import * as React from "react";

// Utilities
import { PointCloudContext, BuildingsContext } from '../../../../../../store'
import { Tool } from '../../../../../../types/tools'
import { getCameraPosition } from './src/getCameraPosition'

// Custom components
import { ShareToolSubmenu } from '../../../../../ui/ShareFeature'

interface ShareToolProps {
  tool: Tool
}

export const SharePointCloudTool: React.FC<ShareToolProps> = ({ tool }) => {
  const { state: pointCloudState } = React.useContext(PointCloudContext)
  const { state: buildingState } = React.useContext(BuildingsContext)
  const { building } = buildingState.buildings
  const { viewer } = pointCloudState.pointcloud

  const constructShareUrl = async (): Promise<string> => {
    const origin = window.location.origin
    const pathname = window.location.pathname

    // Get camera position and target
    const cameraPos = getCameraPosition(viewer)
    if (!cameraPos) {
      return origin + pathname
    }

    // Start with existing URL parameters from the current page
    const currentUrl = new URL(window.location.href)
    const params = new URLSearchParams(currentUrl.search)

    // Add/override PointCloud-specific parameters
    params.set('viewer', 'pointcloud')
    params.set('camX', cameraPos.position.x.toFixed(3))
    params.set('camY', cameraPos.position.y.toFixed(3))
    params.set('camZ', cameraPos.position.z.toFixed(3))
    params.set('tarX', cameraPos.target.x.toFixed(3))
    params.set('tarY', cameraPos.target.y.toFixed(3))
    params.set('tarZ', cameraPos.target.z.toFixed(3))
    
    // Add building ID if available
    if (building) {
      params.set('buildingId', String(building.id))
    }

    const shareUrl = `${origin}${pathname}?${params.toString()}`
    return shareUrl
  }

  return (
    <ShareToolSubmenu 
      tool={tool} 
      constructShareUrl={constructShareUrl}
      translationKey="ShareTool"
      dialogTitleKey="SharePointCloudTool"
    />
  )
}