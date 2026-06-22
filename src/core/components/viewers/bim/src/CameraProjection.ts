// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import { CurrentCamera } from './CurrentCamera'
import { FitCamera } from './FitCamera'

export class CameraProjection extends OBC.Component {
  static readonly uuid = '43b40eb1-4203-4ff7-896a-73e56ed8da9f' as const
  enabled = true

  private camera: OBC.OrthoPerspectiveCamera
  private fitCamera: FitCamera | null = null

  // Event that fires when projection changes
  readonly onProjectionChanged = new OBC.Event<{ projection: 'Perspective' | 'Orthographic' }>()

  constructor(components: OBC.Components) {
    super(components)
    components.add(CameraProjection.uuid, this)

    const currentCamera = components.get(CurrentCamera)
    if (!currentCamera.camera) throw new Error('Camera is not initialized.')

    this.camera = currentCamera.camera
    this.fitCamera = components.get(FitCamera)
  }

  get currentProjection() {
    return this.camera.projection.current
  }

  async setProjection(projection: 'Perspective' | 'Orthographic') {
    if (this.camera.projection.current === projection) return

    this.camera.projection.set(projection)

    // Force camera matrix update
    this.camera.three.updateMatrix()
    this.camera.three.updateProjectionMatrix()

    // Small delay to ensure projection is applied
    await new Promise(resolve => setTimeout(resolve, 50))

    if (this.fitCamera) {
      await this.fitCamera.fit()
    }

    // Additional delay after fitting to ensure proper rendering
    await new Promise(resolve => setTimeout(resolve, 100))

    this.onProjectionChanged.trigger({ projection })
  }

  async toggle() {
    const newProjection = this.camera.projection.current === 'Perspective' ? 'Orthographic' : 'Perspective'
    await this.setProjection(newProjection)
  }

  async setOrthographic() {
    await this.setProjection('Orthographic')
  }

  async setPerspective() {
    await this.setProjection('Perspective')
  }
}
