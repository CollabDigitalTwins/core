'use client'

import * as React from 'react'
import * as THREE from 'three'

import { MenusContext, MapContext, BimContext } from '../store'
import { ViewerNames } from '../types'

export type ViewerPosition =
  | { type: 'map'; lat: number; lng: number; zoom: number; bearing: number; pitch: number }
  | { type: 'bim'; camX: number; camY: number; camZ: number; tarX: number; tarY: number; tarZ: number }

export function useCurrentViewerPosition(): () => ViewerPosition | null {
  const { state: menusState } = React.useContext(MenusContext)
  const { currentViewer } = menusState.menus

  const { state: mapState } = React.useContext(MapContext)
  const { map } = mapState.map

  const { state: bimState } = React.useContext(BimContext)
  const { world } = bimState.bim

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

    return null
  }, [currentViewer, map, world])
}
