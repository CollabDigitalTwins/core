// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import { disposeThreeScene } from '../MapLayers/src/disposeThreeScene'

import { syncGizmoCamera } from './mapGizmoCamera'

import type { TransformGizmoHost } from '../../../shared/placement/transformGizmo'
import type * as maplibregl from 'maplibre-gl'

export const MAP_GIZMO_LAYER_ID = 'cdt-placement-gizmo'

interface RenderArgs {
  defaultProjectionData: { mainMatrix: number[] }
}

export interface MapGizmoLayerHandle extends TransformGizmoHost {
  subject(): THREE.Object3D
}

type MapGizmoLayer = MapGizmoLayerHandle & maplibregl.CustomLayerInterface & {
  onAdd(map: maplibregl.Map, gl: WebGLRenderingContext): void
  render(gl: WebGLRenderingContext, args: RenderArgs): void
  onRemove(): void
}

const _clip = new THREE.Matrix4()

/** The gizmo's own overlay: one scene above every other layer, drawn with maplibre's own camera. */
export function createMapGizmoLayer(): MapGizmoLayer {
  let map: maplibregl.Map | null = null
  let renderer: THREE.WebGLRenderer | null = null
  let scene: THREE.Scene | null = null
  const camera = new THREE.PerspectiveCamera()
  const subject = new THREE.Object3D()

  return {
    id: MAP_GIZMO_LAYER_ID,
    type: 'custom',
    renderingMode: '3d',

    onAdd(nextMap, gl) {
      map = nextMap
      scene = new THREE.Scene()
      scene.add(subject)
      renderer = new THREE.WebGLRenderer({ canvas: nextMap.getCanvas(), context: gl, antialias: true })
      renderer.autoClear = false
    },

    render(_gl, args) {
      if (!renderer || !scene || !map) return

      const canvas = map.getCanvas()
      syncGizmoCamera(camera, _clip.fromArray(args.defaultProjectionData.mainMatrix), canvas.width / canvas.height)
      renderer.resetState()
      renderer.render(scene, camera)
    },

    onRemove() {
      if (scene) disposeThreeScene(scene)
      renderer?.dispose()
      renderer = null
      scene = null
      map = null
    },

    camera: () => camera,
    domElement: () => map?.getCanvas() ?? null,
    scene: () => scene,
    subject: () => subject,

    setDragging(dragging) {
      if (!map) return
      if (dragging) {
        map.dragPan.disable()
        map.dragRotate.disable()
        return
      }
      map.dragPan.enable()
      map.dragRotate.enable()
    },
  }
}
