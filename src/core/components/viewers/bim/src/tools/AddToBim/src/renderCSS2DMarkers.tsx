// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'

import { HooksCtx, type HooksBag } from '../../../../../../../hooks/provider'

export interface MarkerRef {
  root: ReturnType<typeof createRoot>
  sphere: THREE.Mesh
  css2dObject: CSS2DObject
}

export interface MarkerConfig<T> {
  items: T[]
  markerIdKey: 'commentId' | 'sensorId'
  /** Persistent registry keyed by item id — create with React.useRef(new Map()) in the caller */
  registry: React.MutableRefObject<Map<string, MarkerRef>>
  component: React.ComponentType<any>
  propsMapper: (item: T) => Record<string, any>
  sphereColor: string
  isVisible: boolean
  onRemove: (id: number) => void
  hooksContextValue?: HooksBag | null
}

export function renderCSS2DMarkers<T extends { id: number; x?: number | null; y?: number | null; z?: number | null }>(
  world: any,
  config: MarkerConfig<T>
): void {
  if (!world) return

  const { items, markerIdKey, component, propsMapper, sphereColor, isVisible, onRemove, registry, hooksContextValue } = config
  const reg = registry.current

  // Filter items to only include those with valid 3D coordinates
  const validItems = items.filter((item): item is T & { x: number; y: number; z: number } =>
    item.x != null && item.y != null && item.z != null
  )

  // Hide all markers if not visible — remove all from scene and clear registry
  if (!isVisible) {
    reg.forEach(({ sphere, css2dObject }) => {
      world.scene.three.remove(sphere)
      world.scene.three.remove(css2dObject)
      sphere.geometry?.dispose()
      if (sphere.material instanceof THREE.Material) sphere.material.dispose()
    })
    reg.clear()
    return
  }

  const eligibleIds = new Set(validItems.map(item => String(item.id)))

  // Remove markers for deleted/invisible items
  const toDelete: string[] = []
  reg.forEach(({ sphere, css2dObject }, id) => {
    if (!eligibleIds.has(id)) {
      world.scene.three.remove(sphere)
      world.scene.three.remove(css2dObject)
      sphere.geometry?.dispose()
      if (sphere.material instanceof THREE.Material) sphere.material.dispose()
      toDelete.push(id)
    }
  })
  toDelete.forEach(id => reg.delete(id))

  // Update or create markers
  for (const item of validItems) {
    const itemId = String(item.id)
    const existing = reg.get(itemId)

    const resolvedProps = {
      worldCamera: world.camera.three,
      targetPoint: new THREE.Vector3(item.x, item.y, item.z),
      onClose: () => {},
      onRemove: () => onRemove(item.id),
      // propsMapper wins: it can supply richer, per-item handlers (e.g. author-gated
      // delete, select/focus/edit/reply) that override these generic defaults.
      ...propsMapper(item),
    }

    if (existing) {
      // Re-render with latest props (e.g. highlight change)
      const markerElement = React.createElement(component, { ...resolvedProps, sphere: existing.sphere })
      existing.root.render(
        hooksContextValue
          ? React.createElement(HooksCtx.Provider, { value: hooksContextValue }, markerElement)
          : markerElement
      )
      continue
    }

    // Create new marker
    const hitPoint = new THREE.Vector3(item.x, item.y, item.z)

    const sphereGeometry = new THREE.SphereGeometry(0.04, 10, 10)
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: sphereColor })
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    sphere.position.copy(hitPoint)
    sphere.userData[markerIdKey] = itemId
    world.scene.three.add(sphere)

    const labelDiv = document.createElement('div')
    labelDiv.style.pointerEvents = 'auto'
    const root = createRoot(labelDiv)
    const markerElement = React.createElement(component, { ...resolvedProps, sphere })
    root.render(
      hooksContextValue
        ? React.createElement(HooksCtx.Provider, { value: hooksContextValue }, markerElement)
        : markerElement
    )

    const css2dObject = new CSS2DObject(labelDiv)
    css2dObject.position.copy(hitPoint)
    css2dObject.position.y += 0.2
    css2dObject.userData[markerIdKey] = itemId
    css2dObject.element.style.pointerEvents = 'auto'
    world.scene.three.add(css2dObject)

    reg.set(itemId, { root, sphere, css2dObject })
  }
}
