// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'

import { CurrentWorld } from '../../CurrentWorld'
import { disposeObject3D } from '../../lib/disposeObject3D'
import { initializeCSS2DRenderer } from '../../tools/AddToBim/src/FileMarkerUtils'

import { clientToPlan, pixelDistance, requestPlanRender } from './planScene'
import { containsPoint } from './shapeEditing'

import type { PlanPoint } from './planPointer'
import type { ClientPoint } from './planScene'
import type { ModelIdMap } from '../../lib/bimTree'

/** One filled, optionally outlined and labelled polygon a plugin draws on the open plan. */
export interface PlanOverlayShape {
  id: string
  points: readonly PlanPoint[]
  /** `0xRRGGBB`. */
  fill: number
  /** `0`–`1`, default 0.45. */
  opacity?: number
  stroke?: number
  label?: string
}

export interface PlanOverlayOptions {
  /** Makes the shapes clickable: hovering one brightens it and shows a pointer. */
  onShapeClick?: (shapeId: string) => void
  /** IFC spaces these shapes stand in for; the plan hides their own room fill, X and tag while the overlay is set. */
  replacesSpaces?: ModelIdMap
}

interface PickableShape {
  owner: string
  id: string
  points: readonly PlanPoint[]
  material: THREE.MeshBasicMaterial
  fill: number
  opacity: number
}

interface OwnerLayer {
  group: THREE.Group
  tags: CSS2DObject[]
  pickable: PickableShape[]
  onShapeClick?: (shapeId: string) => void
  replacesSpaces?: ModelIdMap
}

interface Picking {
  canvas: HTMLCanvasElement
  press: ClientPoint | null
  hovered: PickableShape | null
  savedCursor: string | null
  detach: () => void
}

const DEFAULT_OPACITY = 0.45
const FILL_RENDER_ORDER = 900
const STROKE_RENDER_ORDER = 901
const HOVER_LIGHTEN = 0.12
const HOVER_OPACITY_BOOST = 0.2
const CLICK_SLOP_PX = 5

/** Plugin shapes on the active plan, one layer per owner so plugins cannot clear each other. */
export class PluginPlanOverlay {
  private readonly layers = new Map<string, OwnerLayer>()
  private planY: number | null = null
  private picking: Picking | null = null
  readonly onReplacedSpacesChanged = new OBC.Event<void>()

  /** `isBusy` is true while another tool owns the plan pointer, such as a sketch in progress. */
  constructor(
    private readonly components: OBC.Components,
    private readonly isBusy: () => boolean = () => false,
  ) {}

  set(owner: string, shapes: readonly PlanOverlayShape[], options: PlanOverlayOptions = {}): void {
    this.clear(owner)
    const world = this.components.get(CurrentWorld).world
    if (!world || (shapes.length === 0 && !options.replacesSpaces)) return
    if (shapes.some(shape => shape.label)) initializeCSS2DRenderer(world)

    const layer: OwnerLayer = {
      group: new THREE.Group(),
      tags: [],
      pickable: [],
      onShapeClick: options.onShapeClick,
      replacesSpaces: options.replacesSpaces,
    }
    layer.group.name = `plugin-plan-overlay:${owner}`
    for (const shape of shapes) this.addShape(owner, layer, shape)
    world.scene.three.add(layer.group)
    this.layers.set(owner, layer)
    this.applyPlacement(layer)
    if (layer.replacesSpaces) this.onReplacedSpacesChanged.trigger()
    requestPlanRender(this.components)
  }

  /** Local ids of the model's spaces that some owner's shapes stand in for. */
  replacedSpaces(modelId: string): Set<number> {
    const ids = new Set<number>()
    for (const layer of this.layers.values()) {
      for (const id of layer.replacesSpaces?.[modelId] ?? []) ids.add(id)
    }
    return ids
  }

  clear(owner: string): void {
    const layer = this.layers.get(owner)
    if (!layer) return
    if (this.picking?.hovered?.owner === owner) this.setHovered(null)
    for (const tag of layer.tags) {
      tag.removeFromParent()
      tag.element.remove()
    }
    disposeObject3D(layer.group)
    this.layers.delete(owner)
    if (layer.replacesSpaces) this.onReplacedSpacesChanged.trigger()
    requestPlanRender(this.components)
  }

  clearAll(): void {
    for (const owner of [...this.layers.keys()]) this.clear(owner)
  }

  /** Shows every layer at the plan height; called when a plan opens. */
  show(planY: number): void {
    this.planY = planY
    for (const layer of this.layers.values()) this.applyPlacement(layer)
    this.attachPicking()
    requestPlanRender(this.components)
  }

  hide(): void {
    this.planY = null
    this.detachPicking()
    for (const layer of this.layers.values()) this.applyPlacement(layer)
    requestPlanRender(this.components)
  }

  /** Drops the hover but leaves the cursor to the tool now taking over the pointer. */
  releasePointer(): void {
    const hovered = this.picking?.hovered
    if (!this.picking || !hovered) return
    this.paintHover(hovered, false)
    this.picking.hovered = null
    requestPlanRender(this.components)
  }

  private applyPlacement(layer: OwnerLayer): void {
    const visible = this.planY !== null
    layer.group.visible = visible
    layer.group.position.y = this.planY ?? 0
    for (const tag of layer.tags) tag.visible = visible
  }

  private addShape(owner: string, layer: OwnerLayer, shape: PlanOverlayShape): void {
    if (shape.points.length < 3) return
    const contour = shape.points.map(point => new THREE.Vector2(point.x, point.z))
    const faces = THREE.ShapeUtils.triangulateShape(contour, [])
    const opacity = shape.opacity ?? DEFAULT_OPACITY

    const fillGeometry = new THREE.BufferGeometry()
    fillGeometry.setAttribute('position', new THREE.Float32BufferAttribute(shape.points.flatMap(point => [point.x, 0, point.z]), 3))
    fillGeometry.setIndex(faces.flat())
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: shape.fill,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    })
    const fill = new THREE.Mesh(fillGeometry, fillMaterial)
    fill.renderOrder = FILL_RENDER_ORDER
    layer.group.add(fill)
    if (layer.onShapeClick) {
      layer.pickable.push({ owner, id: shape.id, points: shape.points, material: fillMaterial, fill: shape.fill, opacity })
    }

    const strokeGeometry = new THREE.BufferGeometry().setFromPoints(shape.points.map(point => new THREE.Vector3(point.x, 0, point.z)))
    const strokeMaterial = new THREE.LineBasicMaterial({ color: shape.stroke ?? shape.fill, depthTest: false, transparent: true })
    const stroke = new THREE.LineLoop(strokeGeometry, strokeMaterial)
    stroke.renderOrder = STROKE_RENDER_ORDER
    layer.group.add(stroke)

    if (shape.label) {
      const tag = makeLabel(shape.label, centroid(shape.points))
      layer.group.add(tag)
      layer.tags.push(tag)
    }
  }

  private attachPicking(): void {
    if (this.picking) return
    const canvas = this.components.get(CurrentWorld).world?.renderer?.three.domElement
    if (!canvas) return
    const onMove = (event: PointerEvent) => {
      if (event.buttons === 0 && !this.isBusy()) this.setHovered(this.shapeAt(event))
    }
    const onDown = (event: PointerEvent) => {
      if (this.picking) this.picking.press = { clientX: event.clientX, clientY: event.clientY }
    }
    const onClick = (event: MouseEvent) => this.onClick(event)
    const onLeave = () => this.setHovered(null)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('pointerleave', onLeave)
    this.picking = {
      canvas, press: null, hovered: null, savedCursor: null,
      detach: () => {
        canvas.removeEventListener('pointermove', onMove)
        canvas.removeEventListener('pointerdown', onDown)
        canvas.removeEventListener('click', onClick)
        canvas.removeEventListener('pointerleave', onLeave)
      },
    }
  }

  private detachPicking(): void {
    if (!this.picking) return
    this.setHovered(null)
    this.picking.detach()
    this.picking = null
  }

  // A press that moved is a pan, not a click.
  private onClick(event: MouseEvent): void {
    const press = this.picking?.press
    if (press && pixelDistance(press, event) > CLICK_SLOP_PX) return
    const shape = this.shapeAt(event)
    if (shape) this.layers.get(shape.owner)?.onShapeClick?.(shape.id)
  }

  // The topmost shape wins: later owners and later shapes draw over earlier ones.
  private shapeAt(pointer: ClientPoint): PickableShape | null {
    const camera = this.components.get(CurrentWorld).world?.camera?.three
    if (!this.picking || !camera || this.planY === null || this.isBusy()) return null
    const at = clientToPlan(camera, this.picking.canvas, pointer, this.planY)
    if (!at) return null
    const candidates = [...this.layers.values()].flatMap(layer => layer.pickable)
    return candidates.findLast(shape => containsPoint(shape.points, at)) ?? null
  }

  private setHovered(shape: PickableShape | null): void {
    const picking = this.picking
    if (!picking) return
    if (picking.hovered !== shape) {
      if (picking.hovered) this.paintHover(picking.hovered, false)
      picking.hovered = shape
      if (shape) this.paintHover(shape, true)
      requestPlanRender(this.components)
    }
    this.applyCursor(picking, shape !== null)
  }

  private applyCursor(picking: Picking, pointing: boolean): void {
    if (pointing && picking.savedCursor === null) {
      picking.savedCursor = picking.canvas.style.cursor
      picking.canvas.style.cursor = 'pointer'
    } else if (!pointing && picking.savedCursor !== null) {
      picking.canvas.style.cursor = picking.savedCursor
      picking.savedCursor = null
    }
  }

  private paintHover(shape: PickableShape, hovered: boolean): void {
    shape.material.color.setHex(shape.fill)
    if (hovered) shape.material.color.offsetHSL(0, 0, HOVER_LIGHTEN)
    shape.material.opacity = hovered ? Math.min(1, shape.opacity + HOVER_OPACITY_BOOST) : shape.opacity
  }
}

function centroid(points: readonly PlanPoint[]): PlanPoint {
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, z: acc.z + point.z }), { x: 0, z: 0 })
  return { x: sum.x / points.length, z: sum.z / points.length }
}

function makeLabel(text: string, at: PlanPoint): CSS2DObject {
  const element = document.createElement('div')
  element.textContent = text
  element.style.cssText = [
    'padding:1px 4px',
    'border-radius:3px',
    'font-size:12px',
    'font-weight:500',
    'white-space:nowrap',
    'color:#1f2937',
    'background:rgba(255,255,255,0.8)',
    'pointer-events:none',
  ].join(';')
  const tag = new CSS2DObject(element)
  tag.position.set(at.x, 0, at.z)
  return tag
}
