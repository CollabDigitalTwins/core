// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'

import { isEditableTarget } from '../../../../../../utils/utils'
import { CurrentWorld } from '../../CurrentWorld'
import { disposeObject3D } from '../../lib/disposeObject3D'

import { planDistance, rectangleCorners, snapRadius, snapToLines, worldPerPixel } from './planPointer'
import { clientToPlan, overlayLineMaterial, pixelDistance, requestPlanRender } from './planScene'

import type { PlanPoint, SnapKind } from './planPointer'
import type { ClientPoint } from './planScene'

export type SketchKind = 'rectangle' | 'polygon'
/** `segment` is two clicks, for host tools such as the north line; plugins get {@link SketchKind}. */
export type SketchShape = SketchKind | 'segment'

export interface SketchHost {
  /** World height of the active plan, or null when no plan is open. */
  planY: () => number | null
  /** Projected plan lines as world `[x0, z0, x1, z1, …]`, or null before lines exist. */
  snapSegments: () => Float32Array | null
  /** False frees the left button for placing points; panning then takes the middle button or Space. */
  setLeftButtonPans: (pans: boolean) => void
}

interface PlanHit {
  point: PlanPoint
  snap: SnapKind | null
}

interface EventSource {
  addEventListener: (type: string, listener: () => void) => void
  removeEventListener: (type: string, listener: () => void) => void
}

interface SnapGlyphs {
  root: THREE.Group
  vertex: THREE.LineSegments
  edge: THREE.LineSegments
}

interface Session {
  kind: SketchShape
  planY: number
  canvas: HTMLCanvasElement
  points: PlanPoint[]
  snap: Float32Array | null
  resolve: (points: PlanPoint[] | null) => void
  pointer: ClientPoint | null
  press: ClientPoint | null
  dragging: boolean
  swallowClick: boolean
  spaceHeld: boolean
  altHeld: boolean
  pressedWhilePanning: boolean
  savedCursor: string
  preview: THREE.Line
  cursor: SnapGlyphs
  listeners: Array<() => void>
}

const SKETCH_COLOR = 0x2563eb
// The OS cursor tracks the mouse with no render lag; one drawn in the scene trails it by a frame or more.
const DRAW_CURSOR = 'crosshair'
const OVERLAY_RENDER_ORDER = 1000
const LEFT_BUTTON = 0
const DRAG_THRESHOLD_PX = 5
const VERTEX_GLYPH_PX = 5
const EDGE_GLYPH_PX = 6
// A second click this close to the last vertex is the first half of a double-click, not a new corner.
const DUPLICATE_SCALE = 0.35

/**
 * Click or drag to draw on the plan, snapping to line corners and edges unless Alt is held. Middle-drag
 * or Space+drag pans; Enter, right-click, double-click or the first vertex closes a polygon; Esc cancels.
 */
export class PlanSketch {
  readonly onActiveChanged = new OBC.Event<boolean>()

  private session: Session | null = null

  constructor(
    private readonly components: OBC.Components,
    private readonly host: SketchHost,
  ) {}

  get isActive(): boolean {
    return this.session !== null
  }

  start(kind: SketchShape): Promise<PlanPoint[] | null> {
    this.cancel()
    const world = this.components.get(CurrentWorld).world
    const planY = this.host.planY()
    const canvas = world?.renderer?.three.domElement
    if (!world || !canvas || planY === null) return Promise.resolve(null)

    return new Promise((resolve) => {
      this.session = this.open(kind, planY, canvas, world, resolve)
      this.onActiveChanged.trigger(true)
    })
  }

  cancel(): void {
    this.finish(null)
  }

  /** Re-reads the plan lines, for when they finish projecting mid-sketch. */
  refreshSnapTargets(): void {
    if (!this.session) return
    this.session.snap = this.host.snapSegments()
    this.refresh()
  }

  private open(
    kind: SketchShape,
    planY: number,
    canvas: HTMLCanvasElement,
    world: OBC.World,
    resolve: Session['resolve'],
  ): Session {
    const preview = new THREE.Line(new THREE.BufferGeometry(), overlayLineMaterial(SKETCH_COLOR))
    preview.name = 'plan-sketch-preview'
    preview.renderOrder = OVERLAY_RENDER_ORDER
    preview.visible = false
    const cursor = createSnapGlyphs()
    world.scene.three.add(preview, cursor.root)

    const session: Session = {
      kind, planY, canvas, resolve, preview, cursor,
      points: [],
      snap: this.host.snapSegments(),
      pointer: null,
      press: null,
      dragging: false,
      swallowClick: false,
      spaceHeld: false,
      altHeld: false,
      pressedWhilePanning: false,
      savedCursor: canvas.style.cursor,
      listeners: [],
    }

    const listen = <K extends keyof WindowEventMap>(
      target: HTMLElement | Window,
      type: K,
      handler: (event: WindowEventMap[K]) => void,
      capture = false,
    ) => {
      target.addEventListener(type, handler as EventListener, capture)
      session.listeners.push(() => target.removeEventListener(type, handler as EventListener, capture))
    }
    // Captured at the window so selection, measurement and the viewport menu never see a sketch click.
    const onCanvas = <E extends Event>(handler: (event: E) => void) => (event: E) => {
      if (event.target !== canvas) return
      event.stopPropagation()
      handler(event)
    }
    listen(window, 'pointerdown', onCanvas(event => this.onPointerDown(event)), true)
    listen(window, 'pointerup', event => this.onPointerUp(event), true)
    listen(window, 'click', onCanvas(event => this.onClick(event)), true)
    listen(window, 'dblclick', onCanvas(() => this.closePolygon()), true)
    listen(window, 'contextmenu', onCanvas((event) => { event.preventDefault(); this.onRightClick() }), true)
    listen(canvas, 'mousemove', event => this.onMove(event))
    listen(canvas, 'mouseleave', () => this.onLeave())
    listen(window, 'keydown', event => this.onKeyDown(event))
    listen(window, 'keyup', event => this.onKeyUp(event))
    listen(window, 'blur', () => { this.setSpaceHeld(false); this.setAltHeld(false) })

    const controls = world.camera?.controls as unknown as EventSource | undefined
    if (controls?.addEventListener) {
      const onCameraUpdate = () => this.refresh()
      controls.addEventListener('update', onCameraUpdate)
      session.listeners.push(() => controls.removeEventListener('update', onCameraUpdate))
    }

    canvas.style.cursor = DRAW_CURSOR
    this.host.setLeftButtonPans(false)
    return session
  }

  private finish(points: PlanPoint[] | null): void {
    const session = this.session
    if (!session) return
    this.session = null
    for (const remove of session.listeners) remove()
    session.canvas.style.cursor = session.savedCursor
    this.host.setLeftButtonPans(true)
    disposeObject3D(session.preview)
    disposeObject3D(session.cursor.root)
    requestPlanRender(this.components)
    this.onActiveChanged.trigger(false)
    session.resolve(points)
  }

  private onPointerDown(event: MouseEvent): void {
    const session = this.session
    if (!session || event.button !== LEFT_BUTTON) return
    session.pressedWhilePanning = session.spaceHeld
    session.press = session.spaceHeld ? null : { clientX: event.clientX, clientY: event.clientY }
    session.dragging = false
  }

  // Not stopped: camera-controls listens for pointerup on the document to end its own drags.
  private onPointerUp(event: MouseEvent): void {
    const session = this.session
    if (!session || event.button !== LEFT_BUTTON) return
    const dragged = session.dragging
    session.press = null
    session.dragging = false
    if (!dragged) return
    session.swallowClick = event.target === session.canvas
    const hit = this.pointerToPlan(event)
    if (hit) this.place(session, hit)
  }

  private onClick(event: MouseEvent): void {
    const session = this.session
    if (!session || event.button !== LEFT_BUTTON) return
    if (session.swallowClick) {
      session.swallowClick = false
      return
    }
    if (session.spaceHeld || session.pressedWhilePanning) return
    const hit = this.pointerToPlan(event)
    if (hit) this.place(session, hit)
  }

  private onRightClick(): void {
    if (this.session?.kind === 'polygon' && this.session.points.length >= 3) this.closePolygon()
    else this.cancel()
  }

  private place(session: Session, hit: PlanHit): void {
    if (session.kind === 'polygon') this.placePolygonPoint(session, hit)
    else this.placeTwoPointCorner(session, hit)
  }

  private placeTwoPointCorner(session: Session, hit: PlanHit): void {
    const first = session.points.at(0)
    if (!first) {
      session.points.push(hit.point)
      this.draw(hit)
      return
    }
    if (planDistance(first, hit.point) <= 1e-3) return
    this.finish(session.kind === 'rectangle' ? rectangleCorners(first, hit.point) : [first, hit.point])
  }

  private placePolygonPoint(session: Session, hit: PlanHit): void {
    const radius = this.radius()
    const first = session.points[0]
    if (session.points.length >= 3 && planDistance(first, hit.point) <= radius) {
      this.finish(session.points)
      return
    }
    const last = session.points.at(-1)
    if (!last || planDistance(last, hit.point) > radius * DUPLICATE_SCALE) session.points.push(hit.point)
    this.draw(hit)
  }

  private onMove(event: MouseEvent): void {
    const session = this.session
    if (!session) return
    session.pointer = { clientX: event.clientX, clientY: event.clientY }
    session.altHeld = event.altKey
    if (session.press && !session.dragging && pixelDistance(session.press, session.pointer) > DRAG_THRESHOLD_PX) {
      this.startDrag(session, session.press)
    }
    this.refresh()
  }

  // A drag anchors its first corner where the button went down, so the shape rubber-bands while dragging.
  private startDrag(session: Session, press: ClientPoint): void {
    session.dragging = true
    if (session.points.length > 0) return
    const anchor = this.pointerToPlan(press)
    if (anchor) session.points.push(anchor.point)
  }

  private onLeave(): void {
    if (!this.session) return
    this.session.pointer = null
    this.session.cursor.root.visible = false
    requestPlanRender(this.components)
  }

  private refresh(): void {
    const pointer = this.session?.pointer
    const hit = pointer ? this.pointerToPlan(pointer) : null
    if (hit) this.draw(hit)
  }

  private onKeyDown(event: KeyboardEvent): void {
    const session = this.session
    if (!session || isEditableTarget(event.target)) return
    if (event.key === 'Alt') {
      this.setAltHeld(true)
      return
    }
    if (event.key === 'Escape') this.cancel()
    else if (event.key === 'Enter') this.closePolygon()
    else if (event.key === ' ') this.setSpaceHeld(true)
    else if (event.key === 'Backspace' && session.points.length > 0) {
      session.points.pop()
      this.refresh()
    } else return
    // Otherwise the key also activates whatever button started the sketch, restarting it.
    event.preventDefault()
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (!this.session || isEditableTarget(event.target)) return
    if (event.key === 'Alt') this.setAltHeld(false)
    if (event.key !== ' ') return
    event.preventDefault()
    this.setSpaceHeld(false)
  }

  private setAltHeld(held: boolean): void {
    if (!this.session || this.session.altHeld === held) return
    this.session.altHeld = held
    this.refresh()
  }

  private setSpaceHeld(held: boolean): void {
    const session = this.session
    if (!session || session.spaceHeld === held) return
    session.spaceHeld = held
    session.canvas.style.cursor = held ? 'grab' : DRAW_CURSOR
    this.host.setLeftButtonPans(held)
    this.refresh()
  }

  private closePolygon(): void {
    const session = this.session
    if (session?.kind === 'polygon' && session.points.length >= 3) this.finish(session.points)
  }

  private pointerToPlan(pointer: ClientPoint): PlanHit | null {
    const session = this.session
    const camera = this.camera()
    if (!session || !camera) return null
    const hit = clientToPlan(camera, session.canvas, pointer, session.planY)
    if (!hit) return null
    if (session.altHeld) return { point: hit, snap: null }
    const snapped = snapToLines(session.snap, session.points, hit, this.radius())
    return snapped ? { point: snapped.point, snap: snapped.kind } : { point: hit, snap: null }
  }

  private camera(): THREE.Camera | undefined {
    return this.components.get(CurrentWorld).world?.camera?.three
  }

  private canvasWidth(): number {
    return this.session?.canvas.clientWidth ?? 0
  }

  private radius(): number {
    return snapRadius(this.camera() as THREE.OrthographicCamera | undefined, this.canvasWidth())
  }

  private worldPerScreenPixel(): number {
    return worldPerPixel(this.camera() as THREE.OrthographicCamera | undefined, this.canvasWidth()) ?? this.radius() / 12
  }

  private draw(hit: PlanHit): void {
    const session = this.session
    if (!session) return
    this.drawPreview(session, hit.point)
    this.drawCursor(session, hit)
    requestPlanRender(this.components)
  }

  private drawPreview(session: Session, cursor: PlanPoint): void {
    const path = previewPath(session.kind, session.points, cursor)
    session.preview.geometry.dispose()
    session.preview.geometry = new THREE.BufferGeometry().setFromPoints(
      path.map(point => new THREE.Vector3(point.x, session.planY, point.z)),
    )
    session.preview.visible = path.length >= 2
  }

  private drawCursor(session: Session, hit: PlanHit): void {
    const { root, vertex, edge } = session.cursor
    root.visible = !session.spaceHeld && hit.snap !== null
    root.position.set(hit.point.x, session.planY, hit.point.z)
    root.scale.setScalar(this.worldPerScreenPixel())
    root.rotation.set(0, screenAlignedYaw(this.camera()), 0)
    vertex.visible = hit.snap === 'vertex'
    edge.visible = hit.snap === 'edge'
  }
}

function previewPath(kind: SketchShape, points: readonly PlanPoint[], cursor: PlanPoint): PlanPoint[] {
  if (kind === 'rectangle' && points.length === 1) return [...rectangleCorners(points[0], cursor), points[0]]
  if (kind === 'polygon' && points.length >= 2) return [...points, cursor, points[0]]
  return [...points, cursor]
}

// The plan view turns to true north, so the snap marker turns with the camera to stay screen-aligned.
function screenAlignedYaw(camera: THREE.Camera | undefined): number {
  if (!camera) return 0
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
  return Math.atan2(-right.z, right.x)
}

function createSnapGlyphs(): SnapGlyphs {
  const vertex = glyph(closedLoopSegments([[-1, -1], [1, -1], [1, 1], [-1, 1]], VERTEX_GLYPH_PX))
  const edge = glyph(closedLoopSegments([[0, -1], [1, 0], [0, 1], [-1, 0]], EDGE_GLYPH_PX))
  const root = new THREE.Group()
  root.name = 'plan-sketch-snap'
  root.visible = false
  root.add(vertex, edge)
  return { root, vertex, edge }
}

function closedLoopSegments(corners: number[][], size: number): number[][] {
  return corners.map(([x, z], i) => {
    const [nx, nz] = corners[(i + 1) % corners.length]
    return [x * size, z * size, nx * size, nz * size]
  })
}

function glyph(segments: number[][]): THREE.LineSegments {
  const positions = segments.flatMap(([x0, z0, x1, z1]) => [x0, 0, z0, x1, 0, z1])
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const lines = new THREE.LineSegments(geometry, overlayLineMaterial(SKETCH_COLOR))
  lines.renderOrder = OVERLAY_RENDER_ORDER + 1
  return lines
}
