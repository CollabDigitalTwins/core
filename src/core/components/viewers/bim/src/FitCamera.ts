// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'

import { CurrentWorld } from './CurrentWorld'

export class FitCamera extends OBC.Component {
  static readonly uuid = 'abcf3535-1841-456d-a500-91809848d8ef' as const

  enabled = false

  world: OBC.World | null = null

  camera: OBC.OrthoPerspectiveCamera | null = null

  fragments: any = null

  constructor(components: OBC.Components) {
    super(components)
    components.add(FitCamera.uuid, this)
    this.world = components.get(CurrentWorld).world
    this.fragments = components.get(OBC.FragmentsManager)
    if (this.world) {
      this.camera = this.world.camera as OBC.OrthoPerspectiveCamera
    }
    else {
      throw new Error('World is not initialized.')
    }
  }

  async fit() {
    if (!this.world || !this.camera) {
      throw new Error('World or camera is not initialized.')
    }

    if (this.fragments) {
      const boundingBox = this.getFragmentsBoundingBox()
      if (boundingBox && !boundingBox.isEmpty()) {
        await this.fitToBox(boundingBox, true)
        return
      }
    }

    if (this.world.meshes && this.world.meshes.size > 0 && this.world.meshes.size > 0) {
      this.camera.fit(this.world.meshes)
    }
    else {
      await this.fitToScene()
    }
  }

  private getFragmentsBoundingBox(): THREE.Box3 | null {
    if (!this.fragments || !this.fragments.groups) {
      return null
    }

    const boundingBox = new THREE.Box3()
    let hasGeometry = false

    try {
      const groups = this.fragments.groups
      const groupsIterable = groups instanceof Map ? groups.values() : Object.values(groups)

      for (const group of groupsIterable) {
        if (group && group.boundingBox && !group.boundingBox.isEmpty()) {
          boundingBox.union(group.boundingBox)
          hasGeometry = true
        }
      }
    }
    catch {
      return null
    }

    return hasGeometry ? boundingBox : null
  }

  private async fitToScene() {
    if (!this.world?.scene?.three) return

    const objects: THREE.Object3D[] = []
    this.world.scene.three.traverse((child) => {
      if (child.type === 'Mesh' && child.visible) {
        objects.push(child)
      }
    })

    if (objects.length > 0) {
      await this.fitToSelection(objects)
    }
  }

  async fitToBox(box: THREE.Box3, animated: boolean = true) {
    if (!this.world?.camera?.controls) {
      throw new Error('Camera controls not available.')
    }

    await this.world.camera.controls.fitToBox(box, animated)
  }

  async fitToSelection(selection: THREE.Object3D[]) {
    if (selection.length === 0) {
      return
    }

    const boundingBox = new THREE.Box3()
    for (const object of selection) {
      const objectBox = new THREE.Box3().setFromObject(object)
      boundingBox.union(objectBox)
    }

    if (!boundingBox.isEmpty()) {
      await this.fitToBox(boundingBox, true)
    }
  }
}
