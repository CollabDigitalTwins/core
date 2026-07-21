// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import {
  CSS2DRenderer,
  CSS2DObject,
} from 'three/addons/renderers/CSS2DRenderer.js'

import FileMarker, { type FileMarkerAction } from '../../../../../../ui/FilesManager/src/FileMarker'

import type { DbFile } from '../../../../../../../types/dbTypes'

export interface AddedFile {
  id: string
  file: File
  position: THREE.Vector3
  imageUrl?: string
}

export const initializeCSS2DRenderer = (world: any) => {
  if (!world) return null
  if ((world as any).css2dRenderer) return (world as any).css2dRenderer

  const css2dRenderer = new CSS2DRenderer()
  css2dRenderer.setSize(
    world.renderer!.three.domElement!.clientWidth,
    world.renderer!.three.domElement!.clientHeight,
  )
  css2dRenderer.domElement.style.position = 'absolute'
  css2dRenderer.domElement.style.top = '0'
  css2dRenderer.domElement.style.left = '0'
  css2dRenderer.domElement.style.pointerEvents = 'none'
  css2dRenderer.domElement.style.zIndex = '1000'
  css2dRenderer.domElement.classList.add('css2d-renderer')

  const container = world.renderer!.three.domElement!.parentElement!
  container.append(css2dRenderer.domElement)
  ;(world as any).css2dRenderer = css2dRenderer

  // Render the CSS2D layer on top of every world render.
  const originalRender = world.renderer!.three.render
  world.renderer!.three.render = function (scene: THREE.Scene, camera: THREE.Camera) {
    originalRender.call(this, scene, camera)
    css2dRenderer.render(scene, camera)
  }

  return css2dRenderer
}

export const createFileMarker = (
  addedFile: AddedFile,
  object3D: THREE.Object3D,
  world: any,
  onAction?: (action: FileMarkerAction) => void,
): CSS2DObject | null => {
  if (!world) return null

  const markerFile = {
    id: Number.parseInt(addedFile.id, 10) || 0,
    name: addedFile.file.name,
    type: addedFile.file.type || 'application/octet-stream',
    url: addedFile.imageUrl ?? '',
    assetId: addedFile.id,
    uploadedAt: new Date().toISOString(),
    fileOrganizationId: 0,
  } as DbFile

  const labelDiv = document.createElement('div')
  labelDiv.style.pointerEvents = 'auto'
  labelDiv.style.zIndex = '1001'
  labelDiv.addEventListener('contextmenu', e => e.preventDefault())

  createRoot(labelDiv).render(
    React.createElement(FileMarker, { file: markerFile, onAction }),
  )

  const css2dObject = new CSS2DObject(labelDiv)
  css2dObject.position.copy(addedFile.position)
  css2dObject.position.y += 0.2
  ;(css2dObject as any).fileId = addedFile.id
  ;(css2dObject as any).object3D = object3D
  world.scene.three.add(css2dObject)

  return css2dObject
}

export const createGenericFileMarker = (
  addedFile: AddedFile,
  world: any,
  onAction?: (action: FileMarkerAction) => void,
): { marker: CSS2DObject | null, object3D: THREE.Object3D } => {
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xFFFFFF }),
  )
  sphere.position.copy(addedFile.position)
  ;(sphere as any).fileId = addedFile.id
  if (world) world.scene.three.add(sphere)

  const marker = createFileMarker(addedFile, sphere, world, onAction)
  return { marker, object3D: sphere }
}

export const removeMarker = (marker: CSS2DObject | null, world?: any) => {
  if (!marker) return
  if (world) world.scene.three.remove(marker)
  const el = marker.element as HTMLElement | undefined
  el?.parentElement?.removeChild(el)
}
