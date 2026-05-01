import * as THREE from 'three'
import * as React from 'react'
import {
  CSS2DRenderer,
  CSS2DObject,
} from 'three/addons/renderers/CSS2DRenderer.js'
import { createRoot } from 'react-dom/client'
import FileMarker from '../../../../../../ui/FilesManager/src/FileMarker'
import type { DbFile } from '../../../../../../../types/dbTypes'

export interface AddedFile {
  id: string
  file: File
  position: THREE.Vector3
  imageUrl?: string
}

export const initializeCSS2DRenderer = (world: any) => {
  if (!world) return null

  // Check if CSS2D renderer already exists
  let css2dRenderer = (world as any).css2dRenderer

  if (css2dRenderer) {
    console.log('CSS2D Renderer already exists', css2dRenderer)
  }
  else {
    // Create and set up the CSS2D renderer
    css2dRenderer = new CSS2DRenderer()
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

    // Add to DOM
    const container = world.renderer!.three.domElement!.parentElement!
    container.append(css2dRenderer.domElement);

    // Store reference
    (world as any).css2dRenderer = css2dRenderer

    // Hook into the render loop
    const originalRender = world.renderer!.three.render
    world.renderer!.three.render = function (
      scene: THREE.Scene,
      camera: THREE.Camera,
    ) {
      originalRender.call(this, scene, camera)
      css2dRenderer.render(scene, camera)
    }
  }

  return css2dRenderer
}

export const createFileMarker = (
  addedFile: AddedFile,
  object3D: THREE.Object3D,
  onClick: () => void,
  world: any,
  onContextMenu?: (event: MouseEvent) => void,
): CSS2DObject | null => {
  if (!world) return null

  console.log('Creating FileMarker for:', addedFile.file.name, 'at position:', addedFile.position)
  const markerFile = {
    id: Number.parseInt(addedFile.id, 10) || 0,
    name: addedFile.file.name,
    type: addedFile.file.type || 'application/octet-stream',
    url: addedFile.imageUrl ?? URL.createObjectURL(addedFile.file),
    assetId: addedFile.id,
    uploadedAt: new Date().toISOString(),
    fileOrganizationId: 0,
  } as DbFile

  const labelDiv = document.createElement('div')
  labelDiv.style.display = 'block'
  labelDiv.style.visibility = 'visible'
  labelDiv.style.pointerEvents = 'auto'
  labelDiv.style.zIndex = '1001'

  if (onContextMenu) {
    labelDiv.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      e.stopPropagation()
      onContextMenu(e)
    })
  }

  const root = createRoot(labelDiv)

  root.render(
    React.createElement(FileMarker, {
      file: markerFile,
      onClick,
    }),
  )

  const css2dObject = new CSS2DObject(labelDiv)
  css2dObject.position.copy(addedFile.position)
  css2dObject.position.y += 0.2

  // Ensure the object is visible
  css2dObject.visible = true
  css2dObject.layers.set(0) // Ensure it's on the default layer

  world.scene.three.add(css2dObject);

  (css2dObject as any).fileId = addedFile.id;
  (css2dObject as any).object3D = object3D // Store reference to 3D object

  // Force render multiple times to ensure it appears
  const forceRender = () => {
    if ((world as any).css2dRenderer) {
      (world as any).css2dRenderer.render(world.scene.three, world.camera.three)
    }
  }

  // Force immediate render
  forceRender()

  // Force render after DOM updates
  setTimeout(forceRender, 0)
  setTimeout(forceRender, 100)
  setTimeout(forceRender, 500)

  console.log('FileMarker created and added to scene', {
    position: css2dObject.position,
    fileId: addedFile.id,
    objectPosition: object3D.position,
    visible: css2dObject.visible,
    element: labelDiv,
    renderer: (world as any).css2dRenderer,
  })

  return css2dObject
}

export const updateMarkerPosition = (marker: CSS2DObject | null, object3D: THREE.Object3D) => {
  if (!marker || !object3D) return

  // Update marker position to follow the 3D object
  const worldPosition = new THREE.Vector3()
  object3D.getWorldPosition(worldPosition)
  marker.position.copy(worldPosition)
  marker.position.y += 0.2 // Offset above the object
}

export const createGenericFileMarker = (
  addedFile: AddedFile,
  world: any,
  toolsDispatch: any,
  onContextMenu?: (event: MouseEvent) => void,
) => {
  if (!world) return

  const sphereGeometry = new THREE.SphereGeometry(0.025, 10, 10)
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
  sphere.position.copy(addedFile.position)
  world.scene.three.add(sphere)

  createFileMarker(addedFile, sphere, () => {
    // Click on marker — no-op (actions handled via sidebar/context menu)
  }, world, onContextMenu);

  (sphere as any).fileId = addedFile.id
}
