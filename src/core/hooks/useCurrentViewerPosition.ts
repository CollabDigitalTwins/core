'use client'

import * as React from 'react'
import * as THREE from 'three'

import { getCameraPosition } from '../components/viewers/pointcloud/src/tools/SharePointCloudTool/src/getCameraPosition'
import { MenusContext, MapContext, BimContext, PointCloudContext } from '../store'
import { ViewerNames } from '../types'

export type ViewerPosition =
  | { type: 'map'; lat: number; lng: number; zoom: number; bearing: number; pitch: number }
  | { type: 'bim' | 'pointcloud'; camX: number; camY: number; camZ: number; tarX: number; tarY: number; tarZ: number }

export function useCurrentViewerPosition(): () => ViewerPosition | null {
  const { state: menusState } = React.useContext(MenusContext)
  const { currentViewer } = menusState.menus

  const { state: mapState } = React.useContext(MapContext)
  const { map } = mapState.map

  const { state: bimState } = React.useContext(BimContext)
  const { world } = bimState.bim

  const { state: pcState } = React.useContext(PointCloudContext)
  const { viewer } = pcState.pointcloud

  return React.useCallback((): ViewerPosition | null => {
    if (currentViewer === ViewerNames.map && map) {
      const center = map.getCenter()
      return {
        type: 'map',
        lat: parseFloat(center.lat.toFixed(7)),
        lng: parseFloat(center.lng.toFixed(7)),
        zoom: parseFloat(map.getZoom().toFixed(3)),
        bearing: parseFloat(map.getBearing().toFixed(1)),
        pitch: parseFloat(map.getPitch().toFixed(1)),
      }
    }

    if (currentViewer === ViewerNames.bim && world?.camera) {
      try {
        const pos = new THREE.Vector3()
        const tar = new THREE.Vector3()
        world.camera.controls.getPosition(pos)
        world.camera.controls.getTarget(tar)
        return {
          type: 'bim',
          camX: parseFloat(pos.x.toFixed(3)),
          camY: parseFloat(pos.y.toFixed(3)),
          camZ: parseFloat(pos.z.toFixed(3)),
          tarX: parseFloat(tar.x.toFixed(3)),
          tarY: parseFloat(tar.y.toFixed(3)),
          tarZ: parseFloat(tar.z.toFixed(3)),
        }
      } catch { return null }
    }

    if (currentViewer === ViewerNames.pointcloud && viewer) {
      const cam = getCameraPosition(viewer)
      if (!cam) return null
      return {
        type: 'pointcloud',
        camX: parseFloat(cam.position.x.toFixed(3)),
        camY: parseFloat(cam.position.y.toFixed(3)),
        camZ: parseFloat(cam.position.z.toFixed(3)),
        tarX: parseFloat(cam.target.x.toFixed(3)),
        tarY: parseFloat(cam.target.y.toFixed(3)),
        tarZ: parseFloat(cam.target.z.toFixed(3)),
      }
    }

    return null
  }, [currentViewer, map, world, viewer])
}
