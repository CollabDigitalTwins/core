// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

import { Highlighter } from '../Highlighter'
import { pickAtPointer } from '../lib/pickAtPointer'
import { BimSceneObjects } from '../SceneObjects'
import { BimSplats } from '../Splats'

import { SceneObjectHighlight } from './sceneObjectHighlight'
import { sameSelection, winningPick } from './selectionState'

import type { SceneSelection, WinningPick } from './selectionState'
import type { HighlightLevel } from '../lib/highlightMaterials'

const HOVER_GUARD_MS = 50

/** The one owner of what is selected in the BIM scene, whatever kind of thing it is. */
export class Selection extends OBC.Component implements OBC.Disposable {
  static uuid = 'f3c1d5a6-0b42-4f78-9a1e-2d7c6b8e5a30' as const

  enabled = true

  readonly onChanged = new OBC.Event<SceneSelection>()
  readonly onDisposed = new OBC.Event<string>()

  private world: OBC.World | null = null
  private canvas: HTMLElement | null = null
  private overlay: SceneObjectHighlight | null = null
  private selection: SceneSelection = null
  private hoverTimer: number | null = null

  constructor(components: OBC.Components) {
    super(components)
    components.add(Selection.uuid, this)
  }

  setup(config: { world: OBC.World }) {
    this.teardown()
    this.world = config.world
    this.canvas = config.world.renderer?.three.domElement ?? null
    this.overlay = new SceneObjectHighlight()

    this.highlighter().ownsPointer = false

    this.canvas?.addEventListener('click', this.onClick)
    this.canvas?.addEventListener('mousemove', this.onMove)
    this.canvas?.addEventListener('mouseleave', this.onLeave)
  }

  get current(): SceneSelection {
    return this.selection
  }

  clear() {
    this.select(null)
  }

  dispose() {
    this.teardown()
    this.onChanged.reset()
    this.onDisposed.trigger(Selection.uuid)
    this.onDisposed.reset()
  }

  private teardown() {
    this.canvas?.removeEventListener('click', this.onClick)
    this.canvas?.removeEventListener('mousemove', this.onMove)
    this.canvas?.removeEventListener('mouseleave', this.onLeave)
    this.canvas = null
    if (this.hoverTimer !== null) clearTimeout(this.hoverTimer)
    this.hoverTimer = null
    this.overlay?.dispose()
    this.overlay = null
  }

  private onClick = (event: MouseEvent) => {
    void this.pick(event.clientX, event.clientY).then((pick) => {
      if (!pick) {
        if (!event.ctrlKey) this.select(null)
        return
      }
      if (pick.kind === 'fragments') {
        this.selectFragment(pick, event.ctrlKey)
        return
      }
      this.select({ kind: pick.kind, fileId: pick.fileId as string })
    })
  }

  private selectFragment(pick: WinningPick, additive: boolean) {
    this.paint(null, 'none')
    this.selection = { kind: 'fragments', items: {} }
    void this.highlighter().highlightItems(
      { [pick.modelId as string]: new Set([pick.localId as number]) },
      additive,
    )
    this.onChanged.trigger(this.selection)
  }

  private onMove = (event: MouseEvent) => {
    if (this.hoverTimer !== null) clearTimeout(this.hoverTimer)
    const { clientX, clientY } = event
    this.hoverTimer = window.setTimeout(() => {
      void this.pick(clientX, clientY).then(pick => this.hover(pick))
    }, HOVER_GUARD_MS)
  }

  private onLeave = () => {
    this.hover(null)
  }

  private hover(pick: WinningPick | null) {
    const highlighter = this.highlighter()
    const selected = this.selection

    if (!pick) {
      highlighter.clearHover()
      this.paint(selected, selected ? 'selected' : 'none')
      return
    }
    if (pick.kind === 'fragments') {
      this.paint(selected, selected ? 'selected' : 'none')
      void highlighter.hoverItems({ [pick.modelId as string]: new Set([pick.localId as number]) })
      return
    }

    highlighter.clearHover()
    // A hover over what is already selected must not downgrade it to the fainter overlay.
    if (selected && selected.kind !== 'fragments' && selected.fileId === pick.fileId) return
    this.paint({ kind: pick.kind, fileId: pick.fileId as string }, 'hover')
  }

  private select(next: SceneSelection) {
    if (sameSelection(this.selection, next)) return

    this.highlighter().clearSelection()
    this.selection = next
    this.paint(next, next ? 'selected' : 'none')
    this.onChanged.trigger(next)
  }

  private paint(selection: SceneSelection, level: HighlightLevel) {
    const splats = this.splats()
    for (const id of splats?.ids() ?? []) splats?.setHighlight(id, 'none')
    this.overlay?.clear()

    if (!selection || selection.kind === 'fragments' || level === 'none') return

    if (selection.kind === 'splat') {
      splats?.setHighlight(selection.fileId, level)
      return
    }
    this.overlay?.set(this.registry()?.get(selection.fileId)?.root ?? null, level)
  }

  private async pick(clientX: number, clientY: number): Promise<WinningPick | null> {
    // A disabled Highlighter means a caller (placement, chrome-hidden mode) is suppressing picking, not just its own rendering.
    if (!this.enabled || !this.world || !this.canvas || !this.highlighter().enabled) return null
    const hits = await pickAtPointer(this.components, this.world, this.canvas, clientX, clientY)
    return hits ? winningPick(hits) : null
  }

  private highlighter(): Highlighter {
    return this.components.get(Highlighter)
  }

  private splats(): BimSplats | null {
    try { return this.components.get(BimSplats) } catch { return null }
  }

  private registry() {
    try { return this.components.get(BimSceneObjects).registry } catch { return null }
  }
}
