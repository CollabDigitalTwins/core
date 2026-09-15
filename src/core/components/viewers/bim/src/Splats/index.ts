// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'

import { createSparkEngine } from '../../../shared/splat/splatLoader'
import { SplatRegistry } from '../../../shared/splat/splatRegistry'
import { createHttpSplatSource } from '../../../shared/splat/splatSource'
import { DEFAULT_SPLAT_PLACEMENT } from '../../../shared/splat/splatUpAxis'

import type { SplatEngine, SplatLoadOptions, SplatRenderSettings } from '../../../shared/splat/splatLoader'
import type { LoadedSplat } from '../../../shared/splat/splatRegistry'
import type { SplatSource } from '../../../shared/splat/splatSource'
import type { SplatPlacement } from '../../../shared/splat/splatUpAxis'
import type { HighlightLevel } from '../lib/highlightMaterials'
import type { ScenePickSource } from '../lib/scenePicker'

/** Frames to keep drawing after a splat settles, because Spark sorts a frame behind. */
const SETTLE_FRAMES = 4

/** The opacity "ghost" sets a splat to, matching the BIM models' own ghost. */
export const GHOST_OPACITY = 0.5

/** What one splat looks like, unlike the renderer-wide {@link SplatRenderSettings}. */
export interface SplatAppearance {
  opacity: number
  maxSh: number
  recolor: string
}

export const DEFAULT_SPLAT_APPEARANCE: SplatAppearance = {
  opacity: 1,
  maxSh: 3,
  recolor: '#ffffff',
}

const HIGHLIGHT_TINT: Record<HighlightLevel, string | null> = {
  none: null,
  hover: '#cfeef5',
  selected: '#73cee2',
}

export interface BimSplatsSetup {
  world: OBC.World
  source?: SplatSource
  engine?: SplatEngine
  requestFrame?: (callback: () => void) => number
  cancelFrame?: (handle: number) => void
}

type OnDemandRenderer = OBC.BaseRenderer & { needsUpdate: boolean }

/** Owns the splats in the BIM scene so they outlive every React panel and die with
 *  `components.dispose()`. React mirrors this; it never owns a splat. */
export class BimSplats extends OBC.Component implements OBC.Disposable, ScenePickSource {
  static uuid = 'a0f9b029-a7af-4274-bfd9-6e492e7bdd0a' as const

  enabled = true

  readonly onChanged = new OBC.Event<string[]>()
  readonly onAppearanceChanged = new OBC.Event<{ id: string; appearance: SplatAppearance }>()
  readonly onSettingsChanged = new OBC.Event<SplatRenderSettings>()
  readonly onDisposed = new OBC.Event()

  private readonly appearances = new Map<string, SplatAppearance>()
  private readonly highlights = new Map<string, HighlightLevel>()
  private world: OBC.World | null = null
  private registry: SplatRegistry | null = null
  private engine: SplatEngine | null = null
  private requestFrame: (callback: () => void) => number = (callback) => requestAnimationFrame(callback)
  private cancelFrame: (handle: number) => void = (handle) => cancelAnimationFrame(handle)

  private frameHandle = 0
  private settled = SETTLE_FRAMES

  constructor(components: OBC.Components) {
    super(components)
    components.add(BimSplats.uuid, this)
  }

  setup(config: BimSplatsSetup) {
    this.teardownWorld()

    this.world = config.world
    this.engine = config.engine ?? createSparkEngine()
    this.registry = new SplatRegistry({
      scene: config.world.scene.three,
      engine: this.engine,
      source: config.source ?? createHttpSplatSource(),
    })
    if (config.requestFrame) this.requestFrame = config.requestFrame
    if (config.cancelFrame) this.cancelFrame = config.cancelFrame

    const renderer = config.world.renderer
    if (!renderer) return

    void this.engine.attach({
      renderer: renderer.three,
      scene: config.world.scene.three,
      onDirty: () => this.refresh(),
    }).then(() => this.excludeFromPostproduction())
  }

  async add(
    id: string,
    placement: SplatPlacement = DEFAULT_SPLAT_PLACEMENT,
    options?: SplatLoadOptions,
  ): Promise<LoadedSplat | null> {
    if (!this.registry) return null

    const loaded = await this.registry.add(id, placement, options)
    this.applyAppearance(loaded)
    this.refresh()
    this.onChanged.trigger(this.ids())
    return loaded
  }

  remove(id: string) {
    this.registry?.remove(id)
    this.appearances.delete(id)
    this.highlights.delete(id)
    this.refresh()
    this.onChanged.trigger(this.ids())
  }

  setPlacement(id: string, placement: SplatPlacement) {
    this.registry?.setPlacement(id, placement)
    this.refresh()
  }

  setVisible(id: string, visible: boolean) {
    this.registry?.setVisible(id, visible)
    this.refresh()
  }

  appearanceOf(id: string): SplatAppearance {
    return { ...DEFAULT_SPLAT_APPEARANCE, ...this.appearances.get(id) }
  }

  setAppearance(id: string, patch: Partial<SplatAppearance>) {
    const appearance = { ...this.appearanceOf(id), ...patch }
    this.appearances.set(id, appearance)

    const splat = this.get(id)
    if (splat) this.applyAppearance(splat)
    this.refresh()
    this.onAppearanceChanged.trigger({ id, appearance })
  }

  isGhosted(id: string): boolean {
    return this.appearanceOf(id).opacity <= GHOST_OPACITY
  }

  setGhosted(id: string, ghosted: boolean) {
    this.setAppearance(id, { opacity: ghosted ? GHOST_OPACITY : 1 })
  }

  /** Tints a splat without touching the tint the user picked, which `appearanceOf` keeps reporting. */
  setHighlight(id: string, level: HighlightLevel) {
    if (this.highlightOf(id) === level) return
    this.highlights.set(id, level)

    const splat = this.get(id)
    if (splat) this.applyAppearance(splat)
    this.refresh()
  }

  highlightOf(id: string): HighlightLevel {
    return this.highlights.get(id) ?? 'none'
  }

  get settings(): SplatRenderSettings | null {
    return this.engine?.settings() ?? null
  }

  configure(patch: Partial<SplatRenderSettings>) {
    this.engine?.configure(patch)
    this.refresh()

    const settings = this.engine?.settings()
    if (settings) this.onSettingsChanged.trigger(settings)
  }

  /** {@link ScenePickSource} — Spark raycasts splats natively, so the menu hits one like a mesh. */
  pick(ray: THREE.Ray, camera: THREE.Camera, thresholdPx: number): { point: THREE.Vector3 } | null {
    return this.pickWithId(ray, camera, thresholdPx)
  }

  /** Like `pick`, but names the splat that was hit. The viewport menu needs the id, not a point. */
  pickWithId(ray: THREE.Ray, _camera: THREE.Camera, _thresholdPx: number): { id: string; point: THREE.Vector3; distance: number } | null {
    const raycaster = new THREE.Raycaster()
    raycaster.ray.copy(ray)

    let nearest: { id: string; point: THREE.Vector3; distance: number } | null = null
    for (const splat of this.list()) {
      if (!splat.root.visible) continue

      const hits: THREE.Intersection[] = []
      splat.mesh.raycast(raycaster, hits)
      const hit = hits[0]
      if (!hit) continue

      const distance = hit.distance ?? ray.origin.distanceTo(hit.point)
      if (!nearest || distance < nearest.distance) nearest = { id: splat.id, point: hit.point, distance }
    }
    return nearest
  }

  /** Where the splat actually sits in world space, so the gizmo pivots on it and not the origin. */
  worldCentroid(id: string): THREE.Vector3 | null {
    const splat = this.get(id)
    if (!splat) return null

    splat.root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(splat.root)
    return box.isEmpty() ? splat.root.position.clone() : box.getCenter(new THREE.Vector3())
  }

  /** The splat's world box, for framing it. Null when it has not loaded enough to have one. */
  boundsOf(id: string): THREE.Box3 | null {
    const splat = this.get(id)
    if (!splat) return null

    splat.root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(splat.root)
    return box.isEmpty() ? null : box
  }

  get(id: string): LoadedSplat | undefined {
    return this.registry?.get(id)
  }

  list(): LoadedSplat[] {
    return this.registry?.list() ?? []
  }

  ids(): string[] {
    return this.list().map((splat) => splat.id)
  }

  /** Wakes the on-demand renderer so a newly sorted frame is painted. */
  refresh() {
    this.settled = 0
    this.startPump()
  }

  dispose() {
    this.teardownWorld()
    this.onChanged.reset()
    this.onAppearanceChanged.reset()
    this.onSettingsChanged.reset()
    this.onDisposed.trigger()
    this.onDisposed.reset()
  }

  private applyAppearance(splat: LoadedSplat) {
    const appearance = this.appearanceOf(splat.id)
    splat.mesh.opacity = appearance.opacity
    splat.mesh.maxSh = appearance.maxSh
    splat.mesh.recolor.set(HIGHLIGHT_TINT[this.highlightOf(splat.id)] ?? appearance.recolor)
  }

  // Splats carry their own colour and are not lit; letting the AO pass touch them only greys them.
  private excludeFromPostproduction() {
    const material = this.engine?.material()
    if (!material) return

    const renderer = this.world?.renderer as unknown as {
      postproduction?: { excludedObjectsPass?: { addExcludedMaterial(material: THREE.Material): void } }
    }
    try {
      renderer?.postproduction?.excludedObjectsPass?.addExcludedMaterial(material)
    } catch {
      return
    }
  }

  private teardownWorld() {
    this.stopPump()
    this.registry?.dispose()
    this.registry = null
    this.engine = null
    this.world = null
    this.appearances.clear()
  }

  private readonly pump = () => {
    if (this.settled < SETTLE_FRAMES) {
      this.settled++
      const renderer = this.world?.renderer as OnDemandRenderer | undefined
      if (renderer) renderer.needsUpdate = true
      this.frameHandle = this.requestFrame(this.pump)
      return
    }
    this.frameHandle = 0
  }

  private startPump() {
    if (this.frameHandle !== 0) return
    this.frameHandle = this.requestFrame(this.pump)
  }

  private stopPump() {
    if (this.frameHandle !== 0) this.cancelFrame(this.frameHandle)
    this.frameHandle = 0
  }
}
