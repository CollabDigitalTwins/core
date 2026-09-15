'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { CurrentWorld } from '../CurrentWorld'
import { pickAtPointer } from '../lib/pickAtPointer'
import { ModelManager } from '../ModelManager'

import { RIGHT_BUTTON, beginPress, opensMenu, trackPress, withinViewport } from './contextMenuGesture'
import { resolveViewportTarget } from './resolveViewportTarget'

import type { RightPress } from './contextMenuGesture'
import type { ViewportTarget } from './resolveViewportTarget'
import type { DbFile } from '../../../../../types/dbTypes'
import type * as OBC from '@thatopen/components'

export interface ViewportMenuState extends ViewportTarget {
  x: number
  y: number
  /** Only a loaded object knows whether it animates; no extension can say. */
  animated: boolean
}

/**
 * One right-button owner for the canvas: picks whatever placeable thing is under the cursor and
 * says where to draw its menu. There can only be one owner, or two menus open at once.
 */
export function useViewportContextMenu(
  components: OBC.Components | null,
  files: DbFile[],
): { menu: ViewportMenuState | null; close: () => void } {
  const [menu, setMenu] = React.useState<ViewportMenuState | null>(null)
  const close = React.useCallback(() => setMenu(null), [])

  const filesRef = React.useRef(files)
  React.useEffect(() => { filesRef.current = files }, [files])

  React.useEffect(() => {
    if (!components) return
    const world = components.get(CurrentWorld).world
    const canvas = world?.renderer?.three.domElement
    if (!world || !canvas) return

    // The right button also trucks the camera, so the menu waits for a press that never moved.
    let press: RightPress | null = null

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== RIGHT_BUTTON) return
      press = beginPress(event.clientX, event.clientY)
      setMenu(null)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (press) press = trackPress(press, event.clientX, event.clientY)
    }

    const onPointerUp = (event: PointerEvent) => {
      if (event.button !== RIGHT_BUTTON) return
      const finished = press
      press = null
      if (!opensMenu(finished)) return

      const { x, y } = finished as RightPress
      void pickAtPointer(components, world, canvas, x, y)
        .then(hits => (hits ? resolveViewportTarget({ files: filesRef.current, ...hits }) : null))
        .then(target => setMenu(target
          ? { ...target, x, y, animated: isAnimated(components, target) }
          : null))
    }

    const onPointerCancel = () => { press = null }

    // Marker overlays sit above the canvas and are not its descendants, so a canvas listener misses them.
    const suppressNativeMenu = (event: MouseEvent) => {
      if (withinViewport(canvas.getBoundingClientRect(), event.clientX, event.clientY)) {
        event.preventDefault()
      }
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('contextmenu', suppressNativeMenu, true)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('contextmenu', suppressNativeMenu, true)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [components])

  return { menu, close }
}

function isAnimated(components: OBC.Components, target: ViewportTarget): boolean {
  if (target.kind !== 'object') return false
  try {
    return components.get(ModelManager).getClips(String(target.file.id)).length > 0
  }
  catch {
    return false
  }
}
