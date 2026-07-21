'use client'

import * as React from 'react'
import * as THREE from 'three'

import { getCameraPosition } from '../components/viewers/pointcloud/src/tools/SharePointCloudTool/src/getCameraPosition'
import { MenusContext, MapContext, BimContext, PointCloudContext, BuildingsContext } from '../store'
import { ViewerNames } from '../types'

export function useShareUrl(): () => Promise<string> {
  const { state: menusState } = React.useContext(MenusContext)
  const { currentViewer } = menusState.menus

  const { state: mapState } = React.useContext(MapContext)
  const { map } = mapState.map

  const { state: bimState } = React.useContext(BimContext)
  const { world } = bimState.bim

  const { state: pcState } = React.useContext(PointCloudContext)
  const { viewer } = pcState.pointcloud

  const { state: buildingState } = React.useContext(BuildingsContext)
  const { building } = buildingState.buildings

  return React.useCallback(async (): Promise<string> => {
    const origin = window.location.origin
    const pathname = window.location.pathname
    const fallback = window.location.href

    if (currentViewer === ViewerNames.map && map) {
      const params = new URLSearchParams({
        viewer: 'map',
        lat: map.getCenter().lat.toFixed(7),
        lng: map.getCenter().lng.toFixed(7),
        zoom: map.getZoom().toFixed(3),
        bearing: map.getBearing().toFixed(1),
        pitch: map.getPitch().toFixed(1),
      })
      return `${origin}${pathname}?${params.toString()}`
    }

    if (currentViewer === ViewerNames.bim && world?.camera) {
      try {
        const pos = new THREE.Vector3()
        const tar = new THREE.Vector3()
        world.camera.controls.getPosition(pos)
        world.camera.controls.getTarget(tar)
        const params = new URLSearchParams(new URL(window.location.href).search)
        params.set('viewer', 'bim')
        params.set('camX', pos.x.toFixed(3))
        params.set('camY', pos.y.toFixed(3))
        params.set('camZ', pos.z.toFixed(3))
        params.set('tarX', tar.x.toFixed(3))
        params.set('tarY', tar.y.toFixed(3))
        params.set('tarZ', tar.z.toFixed(3))
        if (building) params.set('buildingId', String(building.id))
        return `${origin}${pathname}?${params.toString()}`
      } catch {
        return fallback
      }
    }

    if (currentViewer === ViewerNames.pointcloud && viewer) {
      const cam = getCameraPosition(viewer)
      if (cam) {
        const params = new URLSearchParams(new URL(window.location.href).search)
        params.set('viewer', 'pointcloud')
        params.set('camX', cam.position.x.toFixed(3))
        params.set('camY', cam.position.y.toFixed(3))
        params.set('camZ', cam.position.z.toFixed(3))
        params.set('tarX', cam.target.x.toFixed(3))
        params.set('tarY', cam.target.y.toFixed(3))
        params.set('tarZ', cam.target.z.toFixed(3))
        if (building) params.set('buildingId', String(building.id))
        return `${origin}${pathname}?${params.toString()}`
      }
    }

    return fallback
  }, [currentViewer, map, world, viewer, building])
}
