// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBF from '@thatopen/components-front'
import * as FRAGS from '@thatopen/fragments'
import * as THREE from 'three'

import { CurrentWorld } from '../CurrentWorld'
import { requestPlanRender } from '../FloorplanTool/src/planScene'

import type { PlanPoint } from '../FloorplanTool/src/planPointer'
import type * as OBC from '@thatopen/components'

type PlanSegment = [PlanPoint, PlanPoint]

const EDGE_COLOR = 0x2563eb
const OVERLAY_RENDER_ORDER = 1000
const LEFT_BUTTON = 0
const DRAG_THRESHOLD_PX = 5
const MIN_PLAN_LENGTH = 1e-3

/** An edge's footprint on the plan, or null when it runs (nearly) vertical and so has no plan direction. */
export function planEdge(a: THREE.Vector3, b: THREE.Vector3): PlanSegment | null {
  if (Math.hypot(b.x - a.x, b.z - a.z) < MIN_PLAN_LENGTH) return null
  return [{ x: a.x, z: a.z }, { x: b.x, z: b.z }]
}

/**
 * Hover highlights the model edge under the cursor, as the dimension tool snaps to it; a click resolves its
 * plan footprint. Left-drag still orbits; Esc or right-click resolves null.
 */
export function pickModelEdge(components: OBC.Components, model: FRAGS.FragmentsModel): Promise<PlanSegment | null> {
  const world = components.get(CurrentWorld).world
  const canvas = world?.renderer?.three.domElement
  const camera = world?.camera?.three as THREE.PerspectiveCamera | THREE.OrthographicCamera | undefined
  if (!world || !canvas || !camera) return Promise.resolve(null)

  return new Promise((resolve) => {
    const preview = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: EDGE_COLOR, depthTest: false, transparent: true }),
    )
    preview.renderOrder = OVERLAY_RENDER_ORDER
    preview.visible = false
    world.scene.three.add(preview)

    const hoverer = suspendHoverer(components)
    const savedCursor = canvas.style.cursor
    canvas.style.cursor = 'crosshair'

    let edge: PlanSegment | null = null
    let pointer: { clientX: number, clientY: number } | null = null
    let press: { clientX: number, clientY: number } | null = null
    let casting = false
    let done = false
    const listeners: Array<() => void> = []

    const showEdge = (a: THREE.Vector3 | null, b: THREE.Vector3 | null) => {
      edge = a && b ? planEdge(a, b) : null
      preview.visible = !!(a && b)
      if (a && b) preview.geometry.setFromPoints([a, b])
      requestPlanRender(components)
    }

    const cast = async () => {
      if (casting || !pointer || done) return
      casting = true
      const at = pointer
      try {
        const hits = await model.raycastWithSnapping({
          camera, dom: canvas, mouse: new THREE.Vector2(at.clientX, at.clientY),
          snappingClasses: [FRAGS.SnappingClass.LINE],
        })
        if (done) return
        const hit = hits?.find(result => result.snappingClass === FRAGS.SnappingClass.LINE && result.snappedEdgeP1 && result.snappedEdgeP2)
        showEdge(hit?.snappedEdgeP1 ?? null, hit?.snappedEdgeP2 ?? null)
      } catch {
        showEdge(null, null)
      } finally {
        casting = false
      }
      if (pointer !== at) void cast()
    }

    const finish = (result: PlanSegment | null) => {
      if (done) return
      done = true
      for (const remove of listeners) remove()
      canvas.style.cursor = savedCursor
      hoverer.restore()
      preview.removeFromParent()
      preview.geometry.dispose()
      ;(preview.material as THREE.Material).dispose()
      requestPlanRender(components)
      resolve(result)
    }

    const onCanvas = <E extends Event>(handler: (event: E) => void) => (event: E) => {
      if (event.target !== canvas) return
      handler(event)
    }
    const listen = <K extends keyof WindowEventMap>(target: Window | HTMLElement, type: K, handler: (event: WindowEventMap[K]) => void, capture = false) => {
      target.addEventListener(type, handler as EventListener, capture)
      listeners.push(() => target.removeEventListener(type, handler as EventListener, capture))
    }

    listen(canvas, 'pointermove', (event) => {
      pointer = { clientX: event.clientX, clientY: event.clientY }
      void cast()
    })
    listen(window, 'pointerdown', onCanvas((event: PointerEvent) => {
      if (event.button === LEFT_BUTTON) press = { clientX: event.clientX, clientY: event.clientY }
    }), true)
    // Captured at the window so selection never sees the click that picks the edge.
    listen(window, 'click', onCanvas((event: MouseEvent) => {
      const dragged = press && Math.hypot(event.clientX - press.clientX, event.clientY - press.clientY) > DRAG_THRESHOLD_PX
      press = null
      if (dragged || event.button !== LEFT_BUTTON) return
      event.stopPropagation()
      if (edge) finish(edge)
    }), true)
    listen(window, 'contextmenu', onCanvas((event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      finish(null)
    }), true)
    listen(window, 'keydown', (event) => {
      if (event.key === 'Escape') finish(null)
    })
  })
}

// The hover highlight would flash every item under the cursor while the edge is being chosen.
function suspendHoverer(components: OBC.Components): { restore: () => void } {
  try {
    const hoverer = components.get(OBF.Hoverer)
    const wasEnabled = hoverer.enabled
    hoverer.enabled = false
    return { restore: () => { hoverer.enabled = wasEnabled } }
  } catch {
    return { restore: () => undefined }
  }
}
