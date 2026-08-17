// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'

import { createUndoHistory } from '../../../../utils/undoHistory'

import { IfcClasses } from './IfcClasses'
import {
  bucketByAppearance,
  clearSourceOverrides,
  findOverride,
  removeOverride,
  resolveAppearance,
  touchedIdsByModel,
  upsertOverride,
  type AppearanceOverride,
  type AppearanceSource,
  type ElementAppearanceOverrides,
  type NodeAppearance,
  type ResolvedAppearance,
} from './lib/appearanceOverrides'
import { safeRunAsync } from './lib/safeRun'
import { ViewModeCoordinator } from './lib/ViewModeCoordinator'
import { SpatialStructure } from './SpatialStructure'

import type { BimTreeNode } from './lib/bimTree'
import type { UndoHistory } from '../../../../utils/undoHistory'
import type * as FRAGS from '@thatopen/fragments'

/** Trees rebuild in bursts as models load, so coalesce the repaints. */
const REAPPLY_DEBOUNCE_MS = 150

/**
 * Turns one resolved appearance into a Fragments material definition.
 *
 * Only the keys the override actually sets are present. Fragments merges the
 * definition over the element's own material with `Object.assign`, so omitting
 * `color` keeps each element's colour (what an opacity-only override needs) and
 * omitting `opacity` leaves it opaque. `renderedFaces` is left out on purpose:
 * pinning it the way the floorplan highlighter does would force
 * `THREE.DoubleSide` onto everything this paints.
 *
 * `preserveOriginalMaterial` must stay `false`. Fragments skips content
 * deduplication for definitions that set it, and the definition list is
 * append-only behind a `Uint16` index — so the granular `setColor`/`setOpacity`
 * helpers, which set it to `true`, spend one slot per element per call and
 * exhaust the model's ~65 500 slots. At `false` an appearance costs one slot
 * however many elements wear it.
 *
 * The published `MaterialDefinition` marks colour, opacity, transparent and
 * renderedFaces required, so a partial needs the cast. Verified against
 * @thatopen/fragments 3.4.5, whose merge only copies the keys present here.
 */
function materialFor(appearance: NodeAppearance): FRAGS.MaterialDefinition {
  const definition: Partial<FRAGS.MaterialDefinition> = {
    preserveOriginalMaterial: false,
  }

  if (appearance.color !== undefined) {
    definition.color = new THREE.Color(appearance.color)
  }
  if (appearance.opacity !== undefined) {
    definition.opacity = appearance.opacity
    definition.transparent = appearance.opacity < 1
  }

  return definition as FRAGS.MaterialDefinition
}

/**
 * Session-scoped colour and opacity overrides for the Layers tab's two
 * classifier trees, with a shared undo stack.
 *
 * A component rather than React state for two reasons: the sidebar unmounts the
 * tab you are not looking at, and CTRL+Z has to work from anywhere in the
 * viewer. Panels read and write through it and re-render off {@link onChanged},
 * the same way visibility is routed through `lib/bimItemActions` and announced by
 * `VisibilityState`.
 *
 * Overrides are deliberately not persisted. They are also not preserved across
 * floorplan and elevation modes — those repaint the whole model — so this
 * reapplies itself whenever the viewer returns to 3D, and whenever the trees
 * rebuild, which is what lets a newly loaded model pick up an existing IFC class
 * colour.
 */
export class ElementAppearance extends OBC.Component implements OBC.Disposable {
  static readonly uuid = 'd2a5f108-9c47-4b36-8e91-5f7a0c3e64d2' as const

  enabled = true

  readonly onChanged = new OBC.Event<void>()
  /** Required for `dispose()` to run: OBC checks for `dispose` + `onDisposed`. */
  readonly onDisposed = new OBC.Event<string>()

  /**
   * Undo/redo steps for colour and opacity only. Visibility, selection and
   * camera are deliberately out: they have their own affordances, and folding
   * them in would make CTRL+Z unpredictable.
   */
  readonly history: UndoHistory = createUndoHistory()

  private _overrides: AppearanceOverride[] = []
  /**
   * Per-element paint, keyed by owner — in practice a plugin id.
   *
   * Kept out of {@link history} on purpose. CTRL+Z is for the colour work the user did in
   * the sidebar; stepping back through a plugin's programmatic repaint would desync the
   * plugin's own state from the model, and the plugin already owns an off switch.
   */
  private _elementOverrides: ElementAppearanceOverrides = new Map()
  private _seq = 0
  /**
   * Group the last change belonged to, so a slider drag is one undo step rather
   * than one per tick. Cleared by any change outside the group.
   */
  private _coalescingKey: string | null = null
  /** What the last pass painted, so the next one can un-paint exactly that. */
  private _touched = new Map<string, number[]>()
  /** Serialises passes: the resets of one must not interleave with another's. */
  private _applying: Promise<void> = Promise.resolve()
  /** Whether a pass is already waiting, so repeat requests collapse into it. */
  private _applyQueued = false
  private _reapplyTimeout: ReturnType<typeof setTimeout> | null = null
  private _disposed = false

  constructor(components: OBC.Components) {
    super(components)
    components.add(ElementAppearance.uuid, this)

    components.get(SpatialStructure).onSpatialStructureCreated.add(this.scheduleReapply)
    components.get(IfcClasses).onClassesChanged.add(this.scheduleReapply)
    // Leaving a drawing view resets every highlight in the model, ours included.
    components.get(ViewModeCoordinator).onReleased.add(this.scheduleReapply)

    const fragments = components.get(OBC.FragmentsManager)
    fragments.list.onItemDeleted.add(this.onModelRemoved)
  }

  get overrides(): readonly AppearanceOverride[] {
    return this._overrides
  }

  /** The override on one node, if it has one. */
  overrideFor(source: AppearanceSource, nodeId: string): NodeAppearance | undefined {
    const found = findOverride(this._overrides, source, nodeId)
    if (!found) return undefined
    return { color: found.color, opacity: found.opacity }
  }

  /** Whether one tree has anything to reset. */
  hasOverrides(source: AppearanceSource): boolean {
    return this._overrides.some(o => o.source === source)
  }

  /**
   * Sets a colour, an opacity, or both on one node. Merges into whatever that
   * node already carries, so picking a colour does not discard its opacity.
   *
   * `coalesceKey` folds a run of changes into a single undo step. Dragging the
   * opacity slider fires on every tick, and eighteen presses of CTRL+Z to get
   * back across one drag is not undo, it is a punishment. Pass a key that is
   * stable for the drag and different from anything else; the group ends as soon
   * as a change with another key arrives, or when {@link endCoalescing} is called.
   */
  setNodeAppearance(
    source: AppearanceSource,
    nodeId: string,
    change: NodeAppearance,
    coalesceKey?: string,
  ): void {
    if (change.color === undefined && change.opacity === undefined) return
    this.commit(
      upsertOverride(this._overrides, source, nodeId, change, this._seq++),
      change.color !== undefined ? 'Change colour' : 'Change opacity',
      coalesceKey,
    )
  }

  /** Closes the current coalescing group, e.g. when a slider is released. */
  endCoalescing(): void {
    this._coalescingKey = null
  }

  /**
   * Paints specific elements on behalf of one owner, replacing whatever that owner painted
   * before. Passing no items clears it.
   *
   * Goes through the same resolve-and-bucket pass as the trees, so it costs one material
   * slot per distinct appearance rather than one per element.
   */
  setElementAppearance(
    owner: string,
    items: Record<string, number[]>,
    change: NodeAppearance,
  ): void {
    const hasPaint = change.color !== undefined || change.opacity !== undefined
    const entries = Object.entries(items).filter(([, localIds]) => localIds.length > 0)

    if (!hasPaint || entries.length === 0) {
      this.clearElementAppearance(owner)
      return
    }

    const perOwner: ResolvedAppearance = new Map()
    for (const [modelId, localIds] of entries) {
      perOwner.set(modelId, new Map(localIds.map(localId => [localId, change])))
    }

    this._elementOverrides.set(owner, perOwner)
    this.onChanged.trigger()
    void this.reapply()
  }

  /** Drops one owner's paint, leaving every other owner's and both trees' alone. */
  clearElementAppearance(owner: string): void {
    if (!this._elementOverrides.delete(owner)) return
    this.onChanged.trigger()
    void this.reapply()
  }

  /** Drops one node's override, giving its elements back to whatever they inherit. */
  clearNode(source: AppearanceSource, nodeId: string): void {
    if (!findOverride(this._overrides, source, nodeId)) return
    this.commit(removeOverride(this._overrides, source, nodeId), 'Reset element appearance')
  }

  /** Resets one tree to default colours, leaving the other tree's work alone. */
  clearSource(source: AppearanceSource): void {
    if (!this.hasOverrides(source)) return
    this.commit(clearSourceOverrides(this._overrides, source), 'Reset colours')
  }

  /**
   * Steps back one colour or opacity change. Resolves false when there is
   * nothing to undo.
   *
   * Thin on purpose — {@link history} is the real thing, so a keyboard hook or a
   * toolbar button can drive it directly.
   */
  undo(): Promise<boolean> {
    this._coalescingKey = null
    return this.history.undo()
  }

  /** Re-applies the change that was just undone. */
  redo(): Promise<boolean> {
    this._coalescingKey = null
    return this.history.redo()
  }

  /**
   * Applies a new override list and records how to move between it and the old
   * one.
   *
   * Both directions close over a list rather than diffing: the list is a handful
   * of small plain objects, and replaying either way is the same code path as any
   * other change.
   */
  private commit(
    next: AppearanceOverride[],
    label: string,
    coalesceKey?: string,
  ): void {
    const continuesGroup = coalesceKey !== undefined && coalesceKey === this._coalescingKey
    this._coalescingKey = coalesceKey ?? null

    if (continuesGroup) {
      // The step on the stack already restores the state from before the group
      // started, which is where one undo should land. Only its forward target
      // moves, so redo lands where the drag finished rather than on its first tick.
      this.history.amendTop({ redo: () => this.restore(next) })
    } else {
      const previous = this._overrides
      this.history.push({
        label,
        undo: () => this.restore(previous),
        redo: () => this.restore(next),
      })
    }

    this._overrides = next
    this.onChanged.trigger()
    void this.reapply()
  }

  private restore(overrides: AppearanceOverride[]): Promise<void> {
    this._overrides = overrides
    this.onChanged.trigger()
    return this.reapply()
  }

  private scheduleReapply = (): void => {
    if (this._disposed) return
    if (this._reapplyTimeout !== null) clearTimeout(this._reapplyTimeout)
    this._reapplyTimeout = setTimeout(() => {
      this._reapplyTimeout = null
      void this.reapply()
    }, REAPPLY_DEBOUNCE_MS)
  }

  /**
   * Forgetting a removed model's painted ids keeps the next pass from resetting
   * highlights on a model that is gone. The overrides themselves are kept, so
   * reloading the same file brings its colours back.
   */
  private onModelRemoved = (modelId: string): void => {
    this._touched.delete(modelId)
  }

  /**
   * Repaints every override from scratch.
   *
   * Passes run one at a time, and at most one waits behind the running pass: a
   * pass reads the override list when it starts, so a queue of them would repaint
   * the same final state over and over. Dragging the opacity slider asks for a
   * repaint on every tick, and each one resets and re-highlights across the
   * model.
   */
  reapply(): Promise<void> {
    if (this._applyQueued) return this._applying

    this._applyQueued = true
    this._applying = this._applying.then(() => {
      this._applyQueued = false
      return this.applyPass()
    })
    return this._applying
  }

  /**
   * Recomputes the whole appearance rather than patching it: a removed override
   * has to un-paint elements that an incremental path would leave coloured.
   */
  private async applyPass(): Promise<void> {
    if (this._disposed) return

    let fragments: OBC.FragmentsManager
    try {
      fragments = this.components.get(OBC.FragmentsManager)
    } catch {
      // Nothing loaded yet; the tree events will bring us back.
      return
    }

    const resolved = resolveAppearance(this._overrides, this.nodesBySource(), this._elementOverrides)
    const buckets = bucketByAppearance(resolved)
    const nextTouched = touchedIdsByModel(resolved)

    // Scoped resets only. `resetHighlight()` with no ids wipes every highlight in
    // the model, which would take the floorplan tool's work with it.
    for (const [modelId, localIds] of this._touched) {
      const model = fragments.list.get(modelId)
      if (!model || localIds.length === 0) continue
      await safeRunAsync(() => model.resetHighlight(localIds), 'appearanceReset')
    }
    this._touched = nextTouched

    for (const bucket of buckets) {
      const model = fragments.list.get(bucket.modelId)
      if (!model || bucket.localIds.length === 0) continue
      await safeRunAsync(
        () => model.highlight(bucket.localIds, materialFor(bucket.appearance)),
        'appearanceHighlight',
      )
    }

    // Highlighting only queues tile work; nothing renders until the core updates.
    await safeRunAsync(() => fragments.core.update(true), 'appearanceUpdate')
  }

  private nodesBySource(): Record<AppearanceSource, BimTreeNode[]> {
    return {
      'spatial': this.components.get(SpatialStructure).trees,
      'ifc-class': this.components.get(IfcClasses).classes,
    }
  }

  dispose(): void {
    this._disposed = true
    if (this._reapplyTimeout !== null) {
      clearTimeout(this._reapplyTimeout)
      this._reapplyTimeout = null
    }

    try {
      this.components.get(SpatialStructure).onSpatialStructureCreated.remove(this.scheduleReapply)
      this.components.get(IfcClasses).onClassesChanged.remove(this.scheduleReapply)
      this.components.get(ViewModeCoordinator).onReleased.remove(this.scheduleReapply)
      this.components.get(OBC.FragmentsManager).list.onItemDeleted.remove(this.onModelRemoved)
    } catch {
      // Components are disposed in order; anything already gone has taken its
      // listeners with it.
    }

    this._overrides = []
    this.history.clear()
    this._touched.clear()
    this.onChanged.reset()
    this.onDisposed.trigger(ElementAppearance.uuid)
    this.onDisposed.reset()
  }
}
