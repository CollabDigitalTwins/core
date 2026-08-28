// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import * as FRAGS from '@thatopen/fragments'
import * as THREE from 'three'

import { CurrentWorld } from '../CurrentWorld'
import { betterPick, interceptLastPick, ndcFromPointer, pickNearest, SCENE_PICK_WINDOW_PX } from '../lib/scenePicker'

import {
  DEFAULT_MEASUREMENT_SETTINGS,
  MEASUREMENT_PICK_DELAY,
  MEASUREMENT_STICKY_RADIUS_PX,
  snapClassesFor,
  unitsFor,
} from './measurementSettings'

import type {
  BimMeasureKind,
  BimMeasureMode,
  BimMeasurementSettings,
  SnapClassName,
} from './measurementSettings'
import type { LastPickLike, ScenePick, ScenePickSource } from '../lib/scenePicker'

/** Single place the named snap classes cross over into the FRAGS enum. */
const SNAP_CLASS_BY_NAME: Record<SnapClassName, FRAGS.SnappingClass> = {
  point: FRAGS.SnappingClass.POINT,
  line: FRAGS.SnappingClass.LINE,
  face: FRAGS.SnappingClass.FACE,
}

/** Kinds whose creation is finished by the user rather than by a point count. */
const ENDS_ON_ENTER: ReadonlySet<BimMeasureKind> = new Set<BimMeasureKind>(['area', 'volume'])

/** True when a keystroke is aimed at a text field rather than the viewport. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/**
 * Owns all four BIM measurement tools and guarantees only one is live at a
 * time.
 *
 * Why a manager rather than one wrapper per kind: the four OBF measurers each
 * bind their own pointer listeners to the canvas when enabled, so leaving two
 * enabled at once means one double-click feeds both. Activation therefore has
 * to be exclusive, which needs a single owner.
 *
 * Three constraints from components-front 3.4.3 / components 3.4.6 are
 * load-bearing here:
 *
 * - `Measurement.enabled`'s setter calls `setEvents()`, which throws
 *   `"Measurement: you must specify a world first!"` when `world` is null — on
 *   `false` just as much as on `true`. So `world` and all config are applied
 *   *before* `enabled = true`, and a measurer never reaches the components list
 *   without a world (see {@link measurerFor}).
 * - `Components.dispose()` writes `component.enabled = false` on **every**
 *   component in insertion order with no try/catch, then disposes it. A single
 *   world-less measurer therefore aborts the whole teardown loop — including
 *   `FragmentsManager`, which OBC deliberately leaves for last. This is why the
 *   measurers are constructed lazily, per kind, and only ever with a world.
 * - The world is resolved on every activation rather than snapshotted in the
 *   constructor. `Components.get()` caches, and the toolbar calls `get()` on
 *   its first render, which can land before `CurrentWorld.world` is published —
 *   a constructor snapshot would cache `null` for the rest of the session.
 */
export class BimMeasurementManager extends OBC.Component {
  static readonly uuid = '5f8da1b7-6023-4a21-acc7-569127cdde54' as const

  enabled = false

  /**
   * Required for teardown. OBC's `isDisposeable()` is
   * `'dispose' in this && 'onDisposed' in this`, so a component without this
   * event is silently skipped by `Components.dispose()` and its listeners leak.
   */
  readonly onDisposed = new OBC.Event<unknown>()

  readonly onMeasurementAdded = new OBC.Event<{ kind: BimMeasureKind; value: number }>()

  /** Kind currently accepting input, or null when nothing is active. */
  private _activeKind: BimMeasureKind | null = null

  private _settings: BimMeasurementSettings = { ...DEFAULT_MEASUREMENT_SETTINGS }

  /** Element the DOM listeners are attached to, kept so we can detach. */
  private _listenerTarget: HTMLElement | null = null

  /** Hoverer state to restore when we hand control back. */
  private _previousHovererEnabled: boolean | null = null

  /**
   * Kinds whose OBF component has been constructed and given a world. Only
   * these are safe to touch, and only these need tearing down.
   */
  private readonly _built = new Set<BimMeasureKind>()

  /** Renderers that are not fragments — point clouds today — offering their own hits. */
  private readonly _pickSources = new Set<ScenePickSource>()

  private readonly _raycaster = new THREE.Raycaster()

  private _pointerNdc: THREE.Vector2 | null = null

  /** Undoes the live measurer's `lastPick` interception. */
  private _releaseScenePick: (() => void) | null = null

  constructor(components: OBC.Components) {
    super(components)
    components.add(BimMeasurementManager.uuid, this)
    // Deliberately no measurers here. Constructing one registers it in the
    // components list, and until it has a world it is a teardown landmine (see
    // the class comment).
    this.enabled = true
  }

  get activeKind() {
    return this._activeKind
  }

  /**
   * Offers non-fragment geometry to every measurement tool. A registered source's hit replaces
   * the library's fragment snap whenever it is the nearer of the two.
   */
  registerPickSource(source: ScenePickSource) {
    this._pickSources.add(source)
  }

  unregisterPickSource(source: ScenePickSource) {
    this._pickSources.delete(source)
  }

  get settings(): BimMeasurementSettings {
    return { ...this._settings }
  }

  /**
   * Applies settings live to every measurer that exists. Kinds not yet used
   * pick these up when they are first activated, so nothing is lost by setting
   * this before touching the tools.
   */
  set settings(value: BimMeasurementSettings) {
    this._settings = { ...value }
    this.applySettings()
  }

  /**
   * Makes `kind` the live measurement tool in `mode`, disabling any other.
   *
   * Returns false when there is no world or renderer yet, so the caller can
   * leave the toolbar item inactive rather than showing a tool that silently
   * does nothing.
   */
  activate(kind: BimMeasureKind, mode: BimMeasureMode = 'free'): boolean {
    const world = this.resolveWorld()
    if (!world?.renderer) return false

    // Tear down whatever was live first: two enabled measurers would both act
    // on the same double-click.
    this.deactivate()

    const measurer = this.measurerFor(kind, world)
    this.applySettingsTo(kind, measurer)
    this.applySnapping(kind, mode, measurer)

    // `mode` is typed per measurer; the union is validated by MODES_BY_KIND and
    // the toolbar only ever passes a mode the kind advertises.
    ;(measurer as unknown as { mode: string }).mode = mode

    // Last, per the ThatOpen guidance and because the setter needs `world`.
    if (!this.setMeasurerEnabled(measurer, true)) return false

    this._activeKind = kind
    this.suspendHoverer(kind)
    this.attachListeners(world)
    this.attachScenePicking(measurer)

    return true
  }

  /** Cancels any in-progress creation and disables every built measurer. */
  deactivate() {
    this.detachScenePicking()

    for (const { measurer } of this.builtMeasurers()) {
      measurer.cancelCreation()
      this.setMeasurerEnabled(measurer, false)
    }

    this.detachListeners()
    this.restoreHoverer()
    this._activeKind = null
  }

  /** Places a point / picks an item with the live tool. */
  create() {
    const measurer = this.activeMeasurer()
    if (!measurer?.enabled) return
    measurer.create()
  }

  /**
   * Closes the shape being drawn. Only meaningful for area and volume, which
   * accept an arbitrary number of points; length and angle finish on their own
   * point count.
   */
  endCreation() {
    if (!this._activeKind || !ENDS_ON_ENTER.has(this._activeKind)) return
    this.activeMeasurer()?.endCreation()
  }

  /** Deletes the measurement under the cursor. */
  delete() {
    const measurer = this.activeMeasurer()
    if (!measurer?.enabled) return
    measurer.delete()
  }

  /** Discards the in-progress shape without deleting finished measurements. */
  cancelCreation() {
    this.activeMeasurer()?.cancelCreation()
  }

  /** Removes every measurement of every kind that has been used. */
  clearAll() {
    for (const { measurer } of this.builtMeasurers()) {
      measurer.list.clear()
    }
  }

  /**
   * Finished values for one kind, in that kind's configured units. Empty when
   * the kind has never been activated, since its component does not exist yet.
   */
  getValues(kind: 'length' | 'area' | 'angle'): number[] {
    if (!this._built.has(kind)) return []

    const list =
      kind === 'length'
        ? this.components.get(OBF.LengthMeasurement).list
        : kind === 'area'
          ? this.components.get(OBF.AreaMeasurement).list
          : this.components.get(OBF.AngleMeasurement).list

    const values: number[] = []
    for (const item of list) {
      values.push(item.value)
    }
    return values
  }

  /** Volume values are computed on the worker, so this one is async. */
  async getVolumeValues(): Promise<number[]> {
    if (!this._built.has('volume')) return []

    const values: number[] = []
    for (const volume of this.components.get(OBF.VolumeMeasurement).list) {
      values.push(await volume.getValue())
    }
    return values
  }

  dispose() {
    // OBC walks components in insertion order and does not guard the loop, so a
    // throw here abandons every disposal after this one — FragmentsManager
    // included. Detaching our own listeners is the part that must not be
    // skipped, so it goes first and the measurer teardown is best-effort.
    this.detachListeners()

    try {
      this.deactivate()
      this.clearAll()
    } catch (error) {
      console.warn('BimMeasurementManager: measurement teardown was incomplete', error)
    }

    this._pickSources.clear()
    this._activeKind = null
    this._previousHovererEnabled = null
    this.enabled = false
    this.onMeasurementAdded.reset()
    this.onDisposed.trigger()
    this.onDisposed.reset()
  }

  // --- internals ---------------------------------------------------------

  /**
   * Resolved fresh each time. See the class comment: a constructor snapshot can
   * cache `null` permanently.
   */
  private resolveWorld(): OBC.World | null {
    return this.components.get(CurrentWorld).world
  }

  /**
   * Writes `enabled` only when it is safe to do so, and reports whether it
   * happened.
   *
   * The setter calls `setEvents()`, which throws `"you must specify a world
   * first!"` when `world` is null and `"the world needs a renderer!"` when the
   * renderer is gone — and it does so on `false` just as much as on `true`. A
   * measurer we never activated still has `world === null`, and during viewer
   * teardown the renderer is torn down before components are disposed, so both
   * cases are reachable on ordinary paths. An unguarded write throws out of a
   * React effect (white screen) or out of `Components.dispose()`, which walks
   * components in insertion order without guarding the loop and so abandons
   * every disposal after the throw.
   */
  private setMeasurerEnabled(measurer: OBF.Measurement, value: boolean): boolean {
    if (!measurer.world?.renderer) return false

    try {
      measurer.enabled = value
      return true
    } catch (error) {
      console.warn('BimMeasurementManager: could not set measurement enabled state', error)
      return false
    }
  }

  /**
   * Gets the measurer for `kind`, constructing it on first use.
   *
   * `Components.get()` is what registers a component in the components list, so
   * calling it is the point of no return: from here on `Components.dispose()`
   * will write `enabled = false` on this measurer. The world is therefore
   * attached in the same breath, and stays attached for the object's lifetime —
   * see the class comment for why a world-less measurer breaks teardown.
   */
  private measurerFor(kind: BimMeasureKind, world: OBC.World): OBF.Measurement {
    const measurer = ((): OBF.Measurement => {
      switch (kind) {
        case 'length':
          return this.components.get(OBF.LengthMeasurement)
        case 'area':
          return this.components.get(OBF.AreaMeasurement)
        case 'volume':
          return this.components.get(OBF.VolumeMeasurement)
        case 'angle':
          return this.components.get(OBF.AngleMeasurement)
      }
    })()

    if (!this._built.has(kind)) {
      measurer.world = world
      this.subscribeToMeasurementList(kind, measurer)
      this._built.add(kind)
    } else if (measurer.world !== world) {
      // Defensive: a re-created world would leave a stale binding behind.
      measurer.world = world
    }

    return measurer
  }

  /** Null when nothing is active, or when the active kind was never built. */
  private activeMeasurer(): OBF.Measurement | null {
    const kind = this._activeKind
    if (!kind || !this._built.has(kind)) return null

    switch (kind) {
      case 'length':
        return this.components.get(OBF.LengthMeasurement)
      case 'area':
        return this.components.get(OBF.AreaMeasurement)
      case 'volume':
        return this.components.get(OBF.VolumeMeasurement)
      case 'angle':
        return this.components.get(OBF.AngleMeasurement)
    }
  }

  /**
   * The measurers that actually exist, for the apply-to-all operations. Never
   * constructs one, so a viewer session that never measures keeps a components
   * list free of measurement components.
   */
  private builtMeasurers(): { kind: BimMeasureKind; measurer: OBF.Measurement }[] {
    const entries: { kind: BimMeasureKind; measurer: OBF.Measurement }[] = []
    if (this._built.has('length')) {
      entries.push({ kind: 'length', measurer: this.components.get(OBF.LengthMeasurement) })
    }
    if (this._built.has('area')) {
      entries.push({ kind: 'area', measurer: this.components.get(OBF.AreaMeasurement) })
    }
    if (this._built.has('volume')) {
      entries.push({ kind: 'volume', measurer: this.components.get(OBF.VolumeMeasurement) })
    }
    if (this._built.has('angle')) {
      entries.push({ kind: 'angle', measurer: this.components.get(OBF.AngleMeasurement) })
    }
    return entries
  }

  private subscribeToMeasurementList(kind: BimMeasureKind, measurer: OBF.Measurement) {
    if (kind === 'volume') {
      this.components.get(OBF.VolumeMeasurement).list.onItemAdded.add((volume) => {
        void volume.getValue().then((value) => {
          this.onMeasurementAdded.trigger({ kind: 'volume', value })
        })
      })
      return
    }

    // Length, area and angle all expose a synchronous numeric `value`.
    const list = measurer.list as FRAGS.DataSet<{ value: number }>
    list.onItemAdded.add((item) => {
      this.onMeasurementAdded.trigger({ kind, value: item.value })
    })
  }

  private applySettings() {
    for (const { kind, measurer } of this.builtMeasurers()) {
      this.applySettingsTo(kind, measurer)
    }

    // Snap range lives on the shared resolver, not on the measurers. See the
    // note on `snapRange` in measurementSettings.ts for why `snapDistance` is
    // not the knob.
    this.components.get(OBC.SnapResolvers).get().maxDistance = this._settings.snapRange
  }

  private applySettingsTo(kind: BimMeasureKind, measurer: OBF.Measurement) {
    measurer.color = new THREE.Color(this._settings.colour)
    measurer.rounding = this._settings.rounding
    measurer.units = unitsFor(kind, this._settings) as never
    measurer.pickerSize = this._settings.markerSize

    // One pick per intentional cursor stop instead of one per animation frame.
    // Each pick is a GPU readPixels round trip, so MOUSE_MOVE on a large model
    // is what makes the marker stutter.
    measurer.pickMode = OBF.MeasurementPickMode.MOUSE_STOP
    measurer.delay = MEASUREMENT_PICK_DELAY

    // `_vertexPicker` is protected; stickyRadiusPx has no pass-through on
    // Measurement, and without it the marker snaps back to the cursor on the
    // very next pointermove.
    const picker = (measurer as unknown as { _vertexPicker?: { stickyRadiusPx?: number } })
      ._vertexPicker
    if (picker) picker.stickyRadiusPx = MEASUREMENT_STICKY_RADIUS_PX
  }

  private applySnapping(
    kind: BimMeasureKind,
    mode: BimMeasureMode,
    measurer: OBF.Measurement,
  ) {
    const names = snapClassesFor(kind, mode)
    measurer.snappings = names?.map((name) => SNAP_CLASS_BY_NAME[name])
    this.components.get(OBC.SnapResolvers).get().maxDistance = this._settings.snapRange
  }

  /**
   * Volume measurement drives the Hoverer itself — its `onStateChanged`
   * handler saves the previous state, force-enables it to highlight the items
   * being picked, and restores it on disable. Touching it here would fight
   * that. The other three only get highlight flicker from it.
   */
  private suspendHoverer(kind: BimMeasureKind) {
    if (kind === 'volume') return

    const hoverer = this.components.get(OBF.Hoverer)
    this._previousHovererEnabled = hoverer.enabled
    hoverer.enabled = false
  }

  private restoreHoverer() {
    if (this._previousHovererEnabled === null) return
    this.components.get(OBF.Hoverer).enabled = this._previousHovererEnabled
    this._previousHovererEnabled = null
  }

  /**
   * Attached to the canvas's parent, the same element the library's own
   * `setEvents` uses for pointermove, so the snap preview and the click that
   * commits it agree on coordinates.
   */
  private attachListeners(world: OBC.World) {
    const target = world.renderer?.three.domElement.parentElement
    if (!target) return

    this._listenerTarget = target
    target.addEventListener('dblclick', this.handleDoubleClick)
    target.addEventListener('pointermove', this.handlePointerMove)
    window.addEventListener('keydown', this.handleKeyDown)
  }

  private detachListeners() {
    this._listenerTarget?.removeEventListener('dblclick', this.handleDoubleClick)
    this._listenerTarget?.removeEventListener('pointermove', this.handlePointerMove)
    this._listenerTarget = null
    this._pointerNdc = null
    window.removeEventListener('keydown', this.handleKeyDown)
  }

  private handlePointerMove = (event: PointerEvent) => {
    // The canvas, not the listener target: NDC is only meaningful against the drawing buffer.
    const canvas = this.resolveWorld()?.renderer?.three.domElement
    if (!canvas) return
    this._pointerNdc = ndcFromPointer(event.clientX, event.clientY, canvas.getBoundingClientRect())
  }

  private attachScenePicking(measurer: OBF.Measurement) {
    this._releaseScenePick = interceptLastPick(measurer, (current) => this.nearerScenePick(current))
  }

  private detachScenePicking() {
    this._releaseScenePick?.()
    this._releaseScenePick = null
  }

  /** A registered source's hit when it beats the fragment snap the library just took. */
  private nearerScenePick(current: LastPickLike | null): ScenePick | null {
    if (this._pickSources.size === 0 || !this._pointerNdc) return null

    const camera = this.resolveWorld()?.camera.three
    if (!camera) return null

    this._raycaster.setFromCamera(this._pointerNdc, camera)
    const ray = this._raycaster.ray

    return betterPick(current, pickNearest(this._pickSources, ray, camera, SCENE_PICK_WINDOW_PX), ray)
  }

  private handleDoubleClick = () => {
    this.create()
  }

  /**
   * Escape is deliberately absent: the library's own keydown handler already
   * maps it to `cancelCreation`. The React layer handles the rest of the
   * Escape behaviour (clearing the cursor and deselecting the tool).
   */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this._activeKind) return

    // Listening on window means we also see keystrokes aimed at the sidebar's
    // inputs. Swallowing Backspace there would break typing.
    if (isEditableTarget(event.target)) return

    if (event.code === 'Enter' || event.code === 'NumpadEnter') {
      if (!ENDS_ON_ENTER.has(this._activeKind)) return
      event.preventDefault()
      this.endCreation()
      return
    }

    if (event.code === 'Delete' || event.code === 'Backspace') {
      event.preventDefault()
      this.delete()
    }
  }
}
