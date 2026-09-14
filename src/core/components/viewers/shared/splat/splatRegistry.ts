// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import { placementToMatrix } from '../pointcloud/pointCloudTransform'

import { applySplatUpAxis, DEFAULT_SPLAT_PLACEMENT } from './splatUpAxis'

import type { SplatEngine, SplatLoadOptions } from './splatLoader'
import type { SplatSource } from './splatSource'
import type { SplatPlacement } from './splatUpAxis'
import type { SplatMesh } from '@sparkjsdev/spark'

export interface LoadedSplat {
  id: string
  name?: string
  root: THREE.Group
  mesh: SplatMesh
  placement: SplatPlacement
}

export function splatRootName(id: string): string {
  return `splat:${id}`
}

export class SplatRegistry {
  private readonly scene: THREE.Object3D
  private readonly engine: SplatEngine
  private readonly source: SplatSource
  private readonly splats = new Map<string, LoadedSplat>()
  private readonly pending = new Map<string, Promise<LoadedSplat>>()

  constructor(deps: { scene: THREE.Object3D; engine: SplatEngine; source: SplatSource }) {
    this.scene = deps.scene
    this.engine = deps.engine
    this.source = deps.source
  }

  async add(
    id: string,
    placement: SplatPlacement = DEFAULT_SPLAT_PLACEMENT,
    options?: SplatLoadOptions,
  ): Promise<LoadedSplat> {
    const existing = this.splats.get(id)
    if (existing) return existing

    const pending = this.pending.get(id)
    if (pending !== undefined) return pending

    const load = this.loadSplat(id, placement, options)
    this.pending.set(id, load)
    try {
      return await load
    } finally {
      this.pending.delete(id)
    }
  }

  private async loadSplat(
    id: string,
    placement: SplatPlacement,
    options?: SplatLoadOptions,
  ): Promise<LoadedSplat> {
    const resolved = await this.source.resolve(id)
    const mesh = await this.engine.load(resolved.url, options)

    const upFix = new THREE.Group()
    applySplatUpAxis(upFix, placement.sourceUp)
    upFix.add(mesh)

    const root = new THREE.Group()
    root.name = splatRootName(id)
    root.add(upFix)

    const loaded: LoadedSplat = { id, name: resolved.name, root, mesh, placement }
    this.applyPlacement(loaded, placement)
    this.scene.add(root)
    this.splats.set(id, loaded)
    return loaded
  }

  list(): LoadedSplat[] {
    return [...this.splats.values()]
  }

  get(id: string): LoadedSplat | undefined {
    return this.splats.get(id)
  }

  setPlacement(id: string, placement: SplatPlacement): void {
    const splat = this.splats.get(id)
    if (!splat) return
    splat.placement = placement
    const upFix = splat.root.children[0]
    if (upFix) applySplatUpAxis(upFix, placement.sourceUp)
    this.applyPlacement(splat, placement)
  }

  setVisible(id: string, visible: boolean): void {
    const splat = this.splats.get(id)
    if (splat) splat.root.visible = visible
  }

  remove(id: string): void {
    const splat = this.splats.get(id)
    if (!splat) return
    this.scene.remove(splat.root)
    splat.mesh.dispose()
    this.splats.delete(id)
  }

  dispose(): void {
    for (const id of [...this.splats.keys()]) this.remove(id)
    this.engine.dispose()
  }

  private applyPlacement(splat: LoadedSplat, placement: SplatPlacement) {
    placementToMatrix(placement).decompose(splat.root.position, splat.root.quaternion, splat.root.scale)
    splat.root.updateMatrixWorld(true)
  }
}
