// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

export interface AnimationSessionState {
  fileId: string
  name: string
}

/** Which model's playback controls are open. Opened from the marker or the viewport menu alike. */
export class AnimationSession extends OBC.Component {
  static uuid = '7f3a9c14-58d2-4b6e-9c07-3ad81b5e2f90' as const

  enabled = true

  readonly onChanged = new OBC.Event<AnimationSessionState | null>()

  private _active: AnimationSessionState | null = null

  constructor(components: OBC.Components) {
    super(components)
    components.add(AnimationSession.uuid, this)
  }

  get active(): AnimationSessionState | null {
    return this._active
  }

  begin(state: AnimationSessionState): void {
    this._active = state
    this.onChanged.trigger(state)
  }

  end(): void {
    if (!this._active) return
    this._active = null
    this.onChanged.trigger(null)
  }
}
