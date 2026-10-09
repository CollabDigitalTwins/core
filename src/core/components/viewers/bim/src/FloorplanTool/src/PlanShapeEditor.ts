// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'

import { isEditableTarget } from '../../../../../../utils/utils'
import { CurrentWorld } from '../../CurrentWorld'
import { disposeObject3D } from '../../lib/disposeObject3D'

import { snapRadius, snapToLines, worldPerPixel } from './planPointer'
import { clientToPlan, overlayLineMaterial, requestPlanRender } from './planScene'
import { insertVertex, moveEdge, moveVertex, nearestEdge, nearestVertexIndex, removeVertex } from './shapeEditing'

import type { PlanPoint } from './planPointer'
import type { SketchHost } from './PlanSketch'
import type { EdgeHit } from './shapeEditing'

type EditorHost = Pick<SketchHost, 'planY' | 'snapSegments'>

type Drag =
  | { kind: 'vertex'; index: number }
  | { kind: 'edge'; index: number; from: PlanPoint; start: PlanPoint[] }

type Hit =
  | { kind: 'vertex'; index: number }
  | { kind: 'edge'; edge: EdgeHit }

interface Graphics {
  outline: THREE.LineLoop
  handles: THREE.Points
  hoveredEdge: THREE.Line
}

interface Session {
  planY: number
  canvas: HTMLCanvasElement
  points: PlanPoint[]
  selected: number | null
  drag: Drag | null
  hoveredEdge: number | null
  ctrlHeld: boolean
  altHeld: boolean
  swallowClick: boolean
  snap: Float32Array | null
  savedCursor: string
  graphics: Graphics
  resolve: (points: PlanPoint[] | null) => void
  listeners: Array<() => void>
}

const OUTLINE_COLOR = 0x2563eb
const SELECTED_COLOR = 0xf97316
const HANDLE_PX = 10
const HIT_PX = 8
const RENDER_ORDER = 1000
const LEFT_BUTTON = 0

/**
 * Reshapes an outline on the open plan: drag a corner or an edge, Ctrl+click an edge (or anywhere, after
 * the selected corner) to add a corner, Delete removes the selected one. Enter keeps the shape, Esc drops it.
 */
export class PlanShapeEditor {
  readonly onActiveChanged = new OBC.Event<boolean>()

  private session: Session | null = null

  constructor(
    private readonly components: OBC.Components,
    private readonly host: EditorHost,
  ) {}

  get isActive(): boolean {
    return this.session !== null
  }

  start(points: readonly PlanPoint[]): Promise<PlanPoint[] | null> {
    this.cancel()
    const world = this.components.get(CurrentWorld).world
    const planY = this.host.planY()
    const canvas = world?.renderer?.three.domElement
    if (!world || !canvas || planY === null || points.length < 3) return Promise.resolve(null)

    return new Promise((resolve) => {
      this.session = this.open(points, planY, canvas, world, resolve)
      this.draw()
      this.onActiveChanged.trigger(true)
    })
  }

  commit(): void {
    const session = this.session
    if (session) this.finish(session.points)
  }

  cancel(): void {
    this.finish(null)
  }

  refreshSnapTargets(): void {
    if (this.session) this.session.snap = this.host.snapSegments()
  }

  private open(
    points: readonly PlanPoint[],
    planY: number,
    canvas: HTMLCanvasElement,
    world: OBC.World,
    resolve: Session['resolve'],
  ): Session {
    const graphics = createGraphics()
    world.scene.three.add(graphics.outline, graphics.handles, graphics.hoveredEdge)

    const session: Session = {
      planY, canvas, resolve, graphics,
      points: points.map(point => ({ x: point.x, z: point.z })),
      selected: null,
      drag: null,
      hoveredEdge: null,
      ctrlHeld: false,
      altHeld: false,
      swallowClick: false,
      snap: this.host.snapSegments(),
      savedCursor: canvas.style.cursor,
      listeners: [],
    }

    const listen = <K extends keyof WindowEventMap>(
      type: K,
      handler: (event: WindowEventMap[K]) => void,
      capture = false,
    ) => {
      window.addEventListener(type, handler as EventListener, capture)
      session.listeners.push(() => window.removeEventListener(type, handler as EventListener, capture))
    }
    // Captured at the window so a grab on a handle never reaches camera panning or selection.
    listen('pointerdown', event => this.onPointerDown(event), true)
    listen('pointermove', event => this.onPointerMove(event))
    listen('pointerup', event => this.onPointerUp(event))
    listen('click', event => this.onClick(event), true)
    listen('keydown', event => this.onKey(event, true))
    listen('keyup', event => this.onKey(event, false))
    listen('blur', () => this.setModifiers(false, false))
    return session
  }

  private finish(points: PlanPoint[] | null): void {
    const session = this.session
    if (!session) return
    this.session = null
    for (const remove of session.listeners) remove()
    session.canvas.style.cursor = session.savedCursor
    for (const object of Object.values(session.graphics)) disposeObject3D(object)
    requestPlanRender(this.components)
    this.onActiveChanged.trigger(false)
    session.resolve(points)
  }

  private onPointerDown(event: PointerEvent): void {
    const session = this.session
    if (!session || event.target !== session.canvas || event.button !== LEFT_BUTTON) return
    const at = this.toPlan(event)
    if (!at) return
    const hit = this.hitTest(at)
    const insertAfter = event.ctrlKey ? insertionIndex(hit, session.selected) : null

    if (insertAfter !== null) {
      const point = hit?.kind === 'edge' ? hit.edge.point : this.snapped(at, null)
      session.points = insertVertex(session.points, insertAfter, point)
      session.selected = insertAfter + 1
      session.drag = { kind: 'vertex', index: insertAfter + 1 }
    } else if (hit?.kind === 'vertex') {
      session.selected = hit.index
      session.drag = { kind: 'vertex', index: hit.index }
    } else if (hit?.kind === 'edge') {
      session.selected = null
      session.drag = { kind: 'edge', index: hit.edge.index, from: at, start: session.points }
    } else {
      return
    }
    event.stopPropagation()
    session.swallowClick = true
    this.draw()
  }

  private onPointerMove(event: PointerEvent): void {
    const session = this.session
    if (!session) return
    session.ctrlHeld = event.ctrlKey
    session.altHeld = event.altKey
    const at = this.toPlan(event)
    if (!at) return
    const { drag } = session
    if (drag?.kind === 'vertex') {
      session.points = moveVertex(session.points, drag.index, this.snapped(at, drag.index))
    } else if (drag?.kind === 'edge') {
      session.points = moveEdge(drag.start, drag.index, { x: at.x - drag.from.x, z: at.z - drag.from.z })
    } else {
      this.hover(event.target === session.canvas ? at : null)
      return
    }
    this.draw()
  }

  private onPointerUp(event: PointerEvent): void {
    const session = this.session
    if (!session?.drag || event.button !== LEFT_BUTTON) return
    session.drag = null
    this.draw()
  }

  private onClick(event: MouseEvent): void {
    const session = this.session
    if (!session?.swallowClick || event.target !== session.canvas) return
    session.swallowClick = false
    event.stopPropagation()
  }

  private onKey(event: KeyboardEvent, down: boolean): void {
    const session = this.session
    if (!session || isEditableTarget(event.target)) return
    if (event.key === 'Control' || event.key === 'Alt') {
      this.setModifiers(event.ctrlKey, event.altKey)
      return
    }
    if (!down) return
    if (event.key === 'Enter') this.commit()
    else if (event.key === 'Escape') this.cancel()
    else if ((event.key === 'Delete' || event.key === 'Backspace') && session.selected !== null) {
      session.points = removeVertex(session.points, session.selected)
      session.selected = null
      this.draw()
    } else return
    event.preventDefault()
  }

  private setModifiers(ctrl: boolean, alt: boolean): void {
    const session = this.session
    if (!session) return
    session.ctrlHeld = ctrl
    session.altHeld = alt
    this.updateCursor(null)
  }

  private hover(at: PlanPoint | null): void {
    const session = this.session
    if (!session) return
    const hit = at ? this.hitTest(at) : null
    const edge = hit?.kind === 'edge' ? hit.edge.index : null
    this.updateCursor(hit)
    if (edge === session.hoveredEdge) return
    session.hoveredEdge = edge
    this.draw()
  }

  private updateCursor(hit: Hit | null): void {
    const session = this.session
    if (!session) return
    const adding = session.ctrlHeld && (hit?.kind === 'edge' || (!hit && session.selected !== null))
    session.canvas.style.cursor = adding ? 'copy' : hit ? 'move' : session.savedCursor
  }

  private hitTest(at: PlanPoint): Hit | null {
    const session = this.session
    if (!session) return null
    const radius = this.radius(HIT_PX)
    const index = nearestVertexIndex(session.points, at, radius)
    if (index !== null) return { kind: 'vertex', index }
    const edge = nearestEdge(session.points, at, radius)
    return edge ? { kind: 'edge', edge } : null
  }

  // The dragged corner is left out of the snap targets, or it would only ever snap to itself.
  private snapped(at: PlanPoint, dragged: number | null): PlanPoint {
    const session = this.session
    if (!session || session.altHeld) return at
    const corners = session.points.filter((_, index) => index !== dragged)
    return snapToLines(session.snap, corners, at, this.radius())?.point ?? at
  }

  private toPlan(event: MouseEvent): PlanPoint | null {
    const session = this.session
    const camera = this.components.get(CurrentWorld).world?.camera?.three
    return session && camera ? clientToPlan(camera, session.canvas, event, session.planY) : null
  }

  private radius(pixels?: number): number {
    const camera = this.components.get(CurrentWorld).world?.camera?.three as THREE.OrthographicCamera | undefined
    const width = this.session?.canvas.clientWidth ?? 0
    const perPixel = worldPerPixel(camera, width)
    return pixels && perPixel ? perPixel * pixels : snapRadius(camera, width)
  }

  private draw(): void {
    const session = this.session
    if (!session) return
    const { outline, handles, hoveredEdge } = session.graphics
    const at = (point: PlanPoint) => new THREE.Vector3(point.x, session.planY, point.z)

    outline.geometry.dispose()
    outline.geometry = new THREE.BufferGeometry().setFromPoints(session.points.map(at))

    handles.geometry.dispose()
    handles.geometry = new THREE.BufferGeometry().setFromPoints(session.points.map(at))
    const colors = session.points.flatMap((_, index) =>
      new THREE.Color(index === session.selected ? SELECTED_COLOR : OUTLINE_COLOR).toArray())
    handles.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    const edge = session.drag ? null : session.hoveredEdge
    hoveredEdge.visible = edge !== null && edge < session.points.length
    if (hoveredEdge.visible && edge !== null) {
      const ends = [session.points[edge], session.points[(edge + 1) % session.points.length]]
      hoveredEdge.geometry.dispose()
      hoveredEdge.geometry = new THREE.BufferGeometry().setFromPoints(ends.map(at))
    }
    requestPlanRender(this.components)
  }
}

// Ctrl on an edge splits it; Ctrl on empty plan adds a corner after the selected one; Ctrl on a corner adds nothing.
function insertionIndex(hit: Hit | null, selected: number | null): number | null {
  if (hit?.kind === 'edge') return hit.edge.index
  return hit ? null : selected
}

function createGraphics(): Graphics {
  const outline = new THREE.LineLoop(new THREE.BufferGeometry(), overlayLineMaterial(OUTLINE_COLOR))
  outline.name = 'plan-shape-editor-outline'
  outline.renderOrder = RENDER_ORDER

  const hoveredEdge = new THREE.Line(new THREE.BufferGeometry(), overlayLineMaterial(SELECTED_COLOR))
  hoveredEdge.name = 'plan-shape-editor-edge'
  hoveredEdge.renderOrder = RENDER_ORDER + 1
  hoveredEdge.visible = false

  const handles = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({
    size: HANDLE_PX,
    sizeAttenuation: false,
    vertexColors: true,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  }))
  handles.name = 'plan-shape-editor-handles'
  handles.renderOrder = RENDER_ORDER + 2

  return { outline, handles, hoveredEdge }
}
