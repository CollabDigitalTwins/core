// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

import { CurrentWorld } from './CurrentWorld'

import type { CursorType } from '../../../../types/global'

export class Cursor extends OBC.Component {
  static uuid = 'c2d607c5-4335-4b04-95bb-38c02f0caf5e' as const

  enabled = false

  private world: OBC.World | null = null

  constructor(components: OBC.Components) {
    super(components)
    components.add(Cursor.uuid, this)
    this.world = components.get(CurrentWorld).world
    this.setupEventListeners()
  }

  private setupEventListeners() {
    document.addEventListener('keydown', this.handleKeyDown)
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.cleanCursor()
    }
  }

  private cleanCursor() {
    this._cursor = null
    if (!this.world) return
    const domElement = this.world.renderer?.three.domElement
    if (!domElement) return
    domElement.style.cursor = 'default'
  }

  private _cursor: CursorType | null = null

  set cursor(cursor: CursorType) {
    this._cursor = cursor
    if (!this.world) return
    const domElement = this.world.renderer?.three.domElement
    if (!domElement) return
    domElement.style.cursor = cursor
  }

  get cursor() {
    return this._cursor
  }

  dispose() {
    document.removeEventListener('keydown', this.handleKeyDown)
  }
}
