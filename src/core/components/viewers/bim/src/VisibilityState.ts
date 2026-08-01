// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

/**
 * Announces that something changed element visibility in the 3D view.
 *
 * `OBC.Hider` has no events, so a panel that hides something has no way to tell
 * the others. Without this, hiding a class in the IFC class list left the
 * spatial tree's switches showing stale state until its own data happened to
 * change — and the same for the default-hidden classes applied at load time,
 * which run after the panels have already read visibility.
 *
 * Everything that mutates visibility goes through `lib/bimItemActions`, which
 * fires this; the trees subscribe and re-read from the scene.
 */
export class VisibilityState extends OBC.Component {
  static readonly uuid = '9d41e7b8-2c60-4f13-8a75-6e0b3d95c22f' as const

  enabled = true

  readonly onChanged = new OBC.Event<void>()

  constructor(components: OBC.Components) {
    super(components)
    components.add(VisibilityState.uuid, this)
  }

  notify(): void {
    this.onChanged.trigger()
  }
}
