// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { TransformGizmo } from '../../shared/placement/transformGizmo'

import type * as OBC from '@thatopen/components'

/** The shared transform gizmo bound to an OBC world: its camera, canvas, scene and orbit lock. */
export class GizmoController extends TransformGizmo {
  constructor(world: OBC.World) {
    super({
      camera: () => world?.camera?.three ?? null,
      domElement: () => world?.renderer?.three.domElement ?? null,
      scene: () => world?.scene?.three ?? null,
      setDragging: (dragging) => {
        if (world?.camera?.controls) world.camera.controls.enabled = !dragging
      },
    })
  }
}
