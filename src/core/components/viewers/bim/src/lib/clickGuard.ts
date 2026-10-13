// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { beginPress, trackPress } from '../../../shared/placement/contextMenuGesture'

import type { RightPress } from '../../../shared/placement/contextMenuGesture'

/** Longer than this reads as the start of an orbit that barely moved, not a click. */
export const CLICK_MAX_MS = 400

export interface ClickGuard {
  /** True only for a click whose press stayed put and was released quickly. */
  isClick: (event: MouseEvent) => boolean
  dispose: () => void
}

/** Watches presses on `target` so a camera orbit or pan never counts as a pick. */
export function createClickGuard(target: HTMLElement): ClickGuard {
  let press: (RightPress & { at: number }) | null = null

  const onPointerDown = (event: PointerEvent) => {
    press = { ...beginPress(event.clientX, event.clientY), at: event.timeStamp }
  }
  const onPointerMove = (event: PointerEvent) => {
    if (press) press = { ...trackPress(press, event.clientX, event.clientY), at: press.at }
  }

  target.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)

  return {
    isClick(event) {
      const finished = press && trackPress(press, event.clientX, event.clientY)
      const heldFor = press ? event.timeStamp - press.at : Infinity
      press = null
      return !!finished && !finished.moved && heldFor <= CLICK_MAX_MS
    },
    dispose() {
      target.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      press = null
    },
  }
}
