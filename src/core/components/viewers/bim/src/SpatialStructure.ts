// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

import { type BimTreeNode } from './lib/bimTree'
import {
  buildSpatialTree,
  collectSpatialLocalIds,
  nameMapFromItemsData,
} from './lib/spatialTree'

/**
 * Builds the IFC spatial structure tree (Building > Storey > Space > Element)
 * for every loaded model.
 *
 * State is kept **per model**: `LoadModels` calls `getSpatialStructure` once per
 * file, so a single shared tree meant federated models overwrote each other and
 * one failed model wiped the others. `trees` is the union across models, which
 * is also what the hide/isolate actions operate on.
 *
 * The transform itself lives in `lib/spatialTree.ts` as pure functions, so it is
 * testable without a viewer.
 */
export class SpatialStructure extends OBC.Component {
  static readonly uuid = '8f7e4d2c-1a9b-4e6f-8c3d-5b2a9f7e4d2c' as const
  /** v2: v1 cached a different node shape (and IFC categories in place of names). */
  private static readonly cacheKeyPrefix = 'bim:spatial-structure:v2'
  /** Trees past this size are rebuilt rather than cached; they blow the quota anyway. */
  private static readonly maxCachedNodes = 20_000

  enabled = true

  /** Fires whenever any model's tree changes, with the merged tree for all models. */
  readonly onSpatialStructureCreated = new OBC.Event<{
    trees: BimTreeNode[]
    modelId: string
  }>()

  readonly onLoadingStateChanged = new OBC.Event<{ isLoading: boolean }>()

  private fragments: OBC.FragmentsManager | null = null

  private _treesByModelId = new Map<string, BimTreeNode[]>()
  private _loadingPromises = new Map<string, Promise<BimTreeNode[]>>()
  private _activeRequests = 0
  private _isLoading = false

  constructor(components: OBC.Components) {
    super(components)
    components.add(SpatialStructure.uuid, this)
    this.fragments = components.get(OBC.FragmentsManager)
    // No unsubscribe: this component and the manager are disposed together with the world.
    this.fragments.list.onItemDeleted.add(this.onModelRemoved)
  }

  private readonly onModelRemoved = (modelId: string) => {
    this.clearForModel(modelId)
  }

  /** The merged tree across every model that has been built, in insertion order. */
  get trees(): BimTreeNode[] {
    const all: BimTreeNode[] = []
    for (const nodes of this._treesByModelId.values()) all.push(...nodes)
    return all
  }

  get isLoading(): boolean {
    return this._isLoading
  }

  /** True once this model's tree has been built (even if it turned out empty). */
  hasTree(modelId: string): boolean {
    return this._treesByModelId.has(modelId)
  }

  private setLoadingState(isLoading: boolean): void {
    if (this._isLoading !== isLoading) {
      this._isLoading = isLoading
      this.onLoadingStateChanged.trigger({ isLoading })
    }
  }

  private beginLoading(): void {
    this._activeRequests += 1
    this.setLoadingState(true)
  }

  private endLoading(): void {
    this._activeRequests = Math.max(0, this._activeRequests - 1)
    this.setLoadingState(this._activeRequests > 0)
  }

  private emit(modelId: string): void {
    this.onSpatialStructureCreated.trigger({ trees: this.trees, modelId })
  }

  /**
   * Builds (or returns the cached) tree for one model. Concurrent calls for the
   * same model share one build.
   */
  async getSpatialStructure(modelId: string): Promise<BimTreeNode[]> {
    if (!(this.fragments && modelId)) return []

    const cached = this._treesByModelId.get(modelId)
    if (cached) {
      this.emit(modelId)
      return cached
    }

    const persisted = this.readCache(modelId)
    if (persisted) {
      this._treesByModelId.set(modelId, persisted)
      this.emit(modelId)
      return persisted
    }

    const inFlight = this._loadingPromises.get(modelId)
    if (inFlight !== undefined) return inFlight

    const build = this.buildForModel(modelId)
      .catch((error: unknown) => {
        // Scoped to this model on purpose: a corrupt file must not blank out the
        // trees of the models that loaded fine.
        console.error(`Error getting spatial structure for "${modelId}":`, error)
        this._treesByModelId.set(modelId, [])
        this.emit(modelId)
        return [] as BimTreeNode[]
      })
      .finally(() => {
        this._loadingPromises.delete(modelId)
        this.endLoading()
      })

    this._loadingPromises.set(modelId, build)
    return build
  }

  private async buildForModel(modelId: string): Promise<BimTreeNode[]> {
    this.beginLoading()

    const model = this.fragments?.list.get(modelId)
    if (!model) {
      throw new Error(`Model with ID ${modelId} not found in fragments.`)
    }

    const structure = await model.getSpatialStructure()

    // The raw structure carries categories and localIds but no names, so every
    // name has to be fetched. One batched call for the whole model; the results
    // come back index-aligned with the ids that were asked for.
    const localIds = collectSpatialLocalIds(structure)
    let names = new Map<number, string>()
    if (localIds.length > 0) {
      try {
        const itemsData = await model.getItemsData(localIds, {
          attributesDefault: false,
          attributes: ['Name'],
        })
        names = nameMapFromItemsData(localIds, itemsData)
      } catch (error) {
        console.warn('Failed to batch spatial-structure names:', error)
      }
    }

    const nodes = buildSpatialTree(structure, modelId, names)
    if (nodes.length === 0) {
      console.warn(`No IFCBUILDING found in the spatial structure of "${modelId}"`)
    }

    this._treesByModelId.set(modelId, nodes)
    this.writeCache(modelId, nodes)
    this.emit(modelId)

    return nodes
  }

  /** Drops one model's tree, e.g. when the model is removed from the scene. */
  clearForModel(modelId: string): void {
    if (!this._treesByModelId.has(modelId) && !this._loadingPromises.has(modelId)) {
      return
    }
    this._treesByModelId.delete(modelId)
    this._loadingPromises.delete(modelId)
    this.clearCache(modelId)
    this.emit(modelId)
  }

  clearSpatialStructure(): void {
    this._treesByModelId.clear()
    this._loadingPromises.clear()
    this._activeRequests = 0
    this.setLoadingState(false)
    this.onSpatialStructureCreated.trigger({ trees: [], modelId: '' })
  }

  // ---------------------------------------------------------------------------
  // Cache. `items` holds Sets, which JSON cannot round-trip, so the cached form
  // stores plain arrays and is rehydrated on read.
  // ---------------------------------------------------------------------------

  private getCacheKey(modelId: string): string {
    return `${SpatialStructure.cacheKeyPrefix}:${modelId}`
  }

  private readCache(modelId: string): BimTreeNode[] | null {
    if (typeof window === 'undefined') return null

    try {
      const raw = window.localStorage.getItem(this.getCacheKey(modelId))
      if (!raw) return null

      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return null

      return parsed.map(node => this.rehydrate(node as SerializedNode))
    } catch {
      return null
    }
  }

  private writeCache(modelId: string, nodes: BimTreeNode[]): void {
    if (typeof window === 'undefined' || nodes.length === 0) return

    try {
      if (this.countNodes(nodes) > SpatialStructure.maxCachedNodes) return
      window.localStorage.setItem(
        this.getCacheKey(modelId),
        JSON.stringify(nodes.map(node => this.serialize(node))),
      )
    } catch (error) {
      console.warn('Failed to persist spatial structure cache:', error)
    }
  }

  private clearCache(modelId: string): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(this.getCacheKey(modelId))
    } catch {
      // A full or unavailable store is not worth failing a model removal over.
    }
  }

  private countNodes(nodes: BimTreeNode[]): number {
    let total = 0
    for (const node of nodes) total += 1 + this.countNodes(node.children)
    return total
  }

  private serialize(node: BimTreeNode): SerializedNode {
    const items: Record<string, number[]> = {}
    for (const modelId of Object.keys(node.items)) {
      items[modelId] = [...node.items[modelId]]
    }
    return {
      id: node.id,
      label: node.label,
      category: node.category ?? null,
      items,
      children: node.children.map(child => this.serialize(child)),
    }
  }

  private rehydrate(node: SerializedNode): BimTreeNode {
    const items: BimTreeNode['items'] = {}
    for (const modelId of Object.keys(node.items ?? {})) {
      items[modelId] = new Set(node.items[modelId])
    }
    return {
      id: node.id,
      label: node.label,
      category: node.category,
      items,
      children: (node.children ?? []).map(child => this.rehydrate(child)),
    }
  }
}

interface SerializedNode {
  id: string
  label: string
  category: string | null
  items: Record<string, number[]>
  children: SerializedNode[]
}
