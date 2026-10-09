// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import { CurrentWorld } from '../CurrentWorld'
import { Highlighter } from '../Highlighter'
import { BimPointClouds } from '../PointClouds'
import { BimSceneObjects } from '../SceneObjects'
import { BimSplats } from '../Splats'
import { ViewportGizmo } from '../ViewportGizmo'

import { readBimLighting, refreshSunPlacement } from './bimLighting'
import { modelBounds } from './modelBounds'
import { applyRenderMode, readRenderMode } from './renderMode'
import { hideSceneContent, restoreSceneContent } from './sceneContent'

import type { RenderModeName } from './renderMode'
import type { SceneContentVisibility } from './sceneContent'
import type * as OBC from '@thatopen/components'

/**
 * The viewer chrome a drawing tool mutes. Each apply is idempotent and each restore a no-op without its
 * apply, so deactivating stays safe after an activation that failed midway.
 */
export class ChromeController {
  private _savedCursor: string | null = null
  private _cursorApplied = false

  private _savedHighlighterEnabled: boolean | null = null

  private _savedGizmoEnabled: boolean | null = null

  private _ambientLight: THREE.AmbientLight | null = null

  private _savedRenderMode: RenderModeName | null = null

  private _savedBackground: THREE.Color | THREE.Texture | null | undefined =
    undefined

  private readonly _savedContent: SceneContentVisibility = []

  constructor(private components: OBC.Components) {}

  /** Hides the scene content a drawing replaces. The fragment models stay: they are its fill. */
  hideSceneContent() {
    hideSceneContent(this._contentRoots(), this._savedContent)
  }

  restoreSceneContent() {
    restoreSceneContent(this._savedContent)
  }

  // Each get() throws rather than returning null when the viewer is tearing down.
  private _contentRoots() {
    const roots: { visible: boolean }[] = []
    const collect = (read: () => { root: { visible: boolean } }[]) => {
      try { for (const item of read()) roots.push(item.root) }
      catch { /* that kind of content is not in this scene */ }
    }
    collect(() => this.components.get(BimPointClouds).list())
    collect(() => this.components.get(BimSplats).list())
    collect(() => this.components.get(BimSceneObjects).registry?.list() ?? [])
    return roots
  }

  setCursor() {
    const canvas = this._canvas()
    if (!canvas || this._cursorApplied) return
    this._savedCursor = canvas.style.cursor
    canvas.style.cursor = 'grab'
    this._cursorApplied = true
  }

  restoreCursor() {
    if (!this._cursorApplied) return
    const canvas = this._canvas()
    if (canvas) canvas.style.cursor = this._savedCursor ?? ''
    this._savedCursor = null
    this._cursorApplied = false
  }

  disableHighlighter() {
    if (this._savedHighlighterEnabled !== null) return
    const highlighter = this._tryGet(Highlighter)
    if (!highlighter) return
    this._savedHighlighterEnabled = highlighter.enabled
    highlighter.enabled = false
    // `.clear()` does not always fire the listener that removes selection overlays, so they are removed here.
    for (const mesh of highlighter.selectedMeshes as Iterable<THREE.Mesh>) {
      mesh.removeFromParent()
      mesh.geometry?.dispose()
    }
    highlighter.clearSelection()
  }

  restoreHighlighter() {
    if (this._savedHighlighterEnabled === null) return
    const highlighter = this._tryGet(Highlighter)
    if (highlighter) highlighter.enabled = this._savedHighlighterEnabled
    this._savedHighlighterEnabled = null
  }

  hideGizmo() {
    if (this._savedGizmoEnabled !== null) return
    const gizmo = this._tryGet(ViewportGizmo)
    if (!gizmo) return
    this._savedGizmoEnabled = gizmo.enabled
    gizmo.enabled = false
    gizmo.remove()
  }

  showGizmo() {
    if (this._savedGizmoEnabled === null) return
    const gizmo = this._tryGet(ViewportGizmo)
    if (gizmo) {
      gizmo.enabled = this._savedGizmoEnabled
      if (this._savedGizmoEnabled) gizmo.add()
    }
    this._savedGizmoEnabled = null
  }

  /** The default scene uses a shadowed setup where pure-white materials
   *  read as gray; flooding with ambient white restores them. */
  applyLighting() {
    if (this._ambientLight) return
    const sourceWorld = this.components.get(CurrentWorld).world
    if (!sourceWorld?.scene?.three) return
    const light = new THREE.AmbientLight(0xffffff, 3)
    sourceWorld.scene.three.add(light)
    this._ambientLight = light
  }

  removeLighting() {
    if (!this._ambientLight) return
    const sourceWorld = this.components.get(CurrentWorld).world
    if (sourceWorld?.scene?.three) {
      sourceWorld.scene.three.remove(this._ambientLight)
    }
    this._ambientLight.dispose?.()
    this._ambientLight = null
  }

  /** Shadows and ambient occlusion only muddy a flat drawing, so plans render in Basic mode. */
  applyBasicRender() {
    if (this._savedRenderMode !== null) return
    const world = this.components.get(CurrentWorld).world
    if (!world) return
    this._savedRenderMode = readRenderMode(world)
    applyRenderMode(world, 'Basic')
  }

  restoreRenderMode() {
    if (this._savedRenderMode === null) return
    const world = this.components.get(CurrentWorld).world
    const mode = this._savedRenderMode
    this._savedRenderMode = null
    if (!world || mode === 'Basic') return
    applyRenderMode(world, mode)
    refreshSunPlacement(world, modelBounds(this.components), readBimLighting(world))
  }

  /** A warm off-white plan background, as on architectural prints; pure white reads cold. */
  applyDrawingBackground() {
    if (this._savedBackground !== undefined) return
    const sourceWorld = this.components.get(CurrentWorld).world
    const scene = sourceWorld?.scene?.three
    if (!scene) return
    this._savedBackground = scene.background ?? null
    scene.background = new THREE.Color(0xfafaf6)
  }

  restoreBackground() {
    if (this._savedBackground === undefined) return
    const sourceWorld = this.components.get(CurrentWorld).world
    const scene = sourceWorld?.scene?.three
    if (scene) scene.background = this._savedBackground
    this._savedBackground = undefined
  }

  private _canvas(): HTMLCanvasElement | null {
    const sourceWorld = this.components.get(CurrentWorld).world
    return (sourceWorld?.renderer as any)?.three?.domElement ?? null
  }

  private _tryGet<T>(ctor: new (...args: any[]) => T): T | null {
    try {
      return this.components.get(ctor as any) as T
    } catch {
      // SimpleBimViewer registers neither Highlighter nor ViewportGizmo.
      return null
    }
  }
}
