// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

export class CurrentCamera extends OBC.Component {
  static uuid = 'f081b477-d3b0-4e81-a2b4-d91d5498e668' as const

  enabled = false

  constructor(components: OBC.Components) {
    super(components)
    components.add(CurrentCamera.uuid, this)
  }

  private _camera: OBC.OrthoPerspectiveCamera | null = null

  set camera(camera: OBC.OrthoPerspectiveCamera | null) {
    this._camera = camera
  }

  get camera() {
    return this._camera
  }
}
