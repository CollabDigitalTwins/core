// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { CurrentWorld } from '../CurrentWorld'

import type * as OBC from '@thatopen/components'

type OnDemandRenderer = OBC.BaseRenderer & { needsUpdate: boolean }

// Ten seconds at 60fps. A transition still running past that is stuck, and pumping it forever would be too.
const MAX_FRAMES = 600

/**
 * Drives an animated camera-controls transition to completion. It only advances on
 * rendered frames, and the BIM renderer draws on demand, so an unpumped transition
 * never moves and its promise never settles.
 */
export function pumpCameraTransition(
  components: OBC.Components,
  transition: unknown,
): Promise<void> {
  const settled = Promise.resolve(transition).then(() => undefined, () => undefined)
  if (typeof requestAnimationFrame !== 'function') return settled

  let running = true
  void settled.then(() => { running = false })

  let frames = 0
  const step = () => {
    if (!running) return
    if (++frames > MAX_FRAMES) return

    const renderer = currentRenderer(components)
    if (renderer) renderer.needsUpdate = true
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step)

  return settled
}

function currentRenderer(components: OBC.Components): OnDemandRenderer | undefined {
  try {
    return components.get(CurrentWorld).world?.renderer as OnDemandRenderer | undefined
  } catch {
    return undefined
  }
}
