// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

export class CurrentWorld extends OBC.Component {
  static uuid = '5f4b5917-dbd4-4ca4-a8c6-2873f15181c0' as const

  enabled = false

  constructor(components: OBC.Components) {
    super(components)
    components.add(CurrentWorld.uuid, this)
  }

  private _world: OBC.World | null = null

  set world(world: OBC.World | null) {
    this._world = world
  }

  get world() {
    return this._world
  }
}
