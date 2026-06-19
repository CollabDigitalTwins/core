// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

export interface SpatialTreeItem {
  name: string
  children: SpatialTreeItem[]
  localId?: number
  ifcCategory?: string | null
}

export class SpatialStructure extends OBC.Component {
  static readonly uuid = '8f7e4d2c-1a9b-4e6f-8c3d-5b2a9f7e4d2c' as const
  private static readonly cacheKeyPrefix = 'bim:spatial-structure:v1'

  enabled = true

  // Event that fires when spatial structure is created
  readonly onSpatialStructureCreated = new OBC.Event<{ tree: SpatialTreeItem | null }>()

  // Event that fires when loading state changes
  readonly onLoadingStateChanged = new OBC.Event<{ isLoading: boolean }>()

  private fragments: OBC.FragmentsManager | null = null
  
  private _tree: SpatialTreeItem | null = null
  private _treeByModelId = new Map<string, SpatialTreeItem | null>()
  private _loadingPromises = new Map<string, Promise<SpatialTreeItem | null>>()
  private _activeRequests = 0
  private _isLoading: boolean = false

  constructor(components: OBC.Components) {
    super(components)
    components.add(SpatialStructure.uuid, this)
    this.fragments = components.get(OBC.FragmentsManager)
  }

  /**
   * Get the current spatial structure
   */
  get tree(): SpatialTreeItem | null {
    return this._tree
  }

  /**
   * Get the loading state of spatial structure processing
   */
  get isLoading(): boolean {
    return this._isLoading
  }

  /**
   * Set the loading state and trigger the loading state change event
   */
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

  async getSpatialStructure(modelId: string): Promise<SpatialTreeItem | null> {
    if (!this.fragments || !modelId) {
      throw new Error('No fragments or modelId available')
    }

    const cachedTree = this._treeByModelId.get(modelId)
    if (cachedTree !== undefined) {
      this._tree = cachedTree
      this.onSpatialStructureCreated.trigger({ tree: cachedTree })
      return cachedTree
    }

    const persistedTree = this.readCachedSpatialStructure(modelId)
    if (persistedTree) {
      this._tree = persistedTree
      this._treeByModelId.set(modelId, persistedTree)
      this.onSpatialStructureCreated.trigger({ tree: persistedTree })
      return persistedTree
    }

    const existingPromise = this._loadingPromises.get(modelId)
    if (existingPromise) {
      return existingPromise
    }

    const loadingPromise = Promise.resolve()
      .then(async () => {
        this.beginLoading()

        const model = this.fragments.list.get(modelId)
        if (!model) {
          throw new Error(`Model with ID ${modelId} not found in fragments.`)
        }

        const structure = await model.getSpatialStructure()

        const transformedStructure = await this.transformSpatialStructure(structure, model, modelId)

        // console.log('Transformed spatial structure:', transformedStructure)

        // Set the current spatial structure
        this._tree = transformedStructure
        if (transformedStructure) {
          this._treeByModelId.set(modelId, transformedStructure)
          this.writeCachedSpatialStructure(modelId, transformedStructure)
        } else {
          this._treeByModelId.delete(modelId)
        }

        // Trigger the event that spatial structure is created
        this.onSpatialStructureCreated.trigger({ tree: transformedStructure })

        return transformedStructure
      })
      .catch((error) => {
        console.error('Error getting spatial structure:', error)
        this._tree = null
        this.onSpatialStructureCreated.trigger({ tree: null })
        return null
      })
      .finally(() => {
        this._loadingPromises.delete(modelId)
        this.endLoading()
      })

    this._loadingPromises.set(modelId, loadingPromise)
    return loadingPromise
  }

  /**
   * Clear the current spatial structure
   */
  clearSpatialStructure(): void {
    this._tree = null
    this._treeByModelId.clear()
    this._loadingPromises.clear()
    this._activeRequests = 0
    this.setLoadingState(false)
    this.onSpatialStructureCreated.trigger({ tree: null })
  }

  private readCachedSpatialStructure(modelId: string): SpatialTreeItem | null {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      const cachedValue = window.localStorage.getItem(this.getCacheKey(modelId))
      if (!cachedValue) {
        return null
      }

      const parsed = JSON.parse(cachedValue) as SpatialTreeItem
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.children)) {
        return null
      }

      return parsed
    } catch {
      return null
    }
  }

  private writeCachedSpatialStructure(modelId: string, tree: SpatialTreeItem): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(this.getCacheKey(modelId), JSON.stringify(tree))
    } catch (error) {
      console.warn('Failed to persist spatial structure cache:', error)
    }
  }

  private getCacheKey(modelId: string): string {
    return `${SpatialStructure.cacheKeyPrefix}:${modelId}`
  }

  private emitSpatialStructureUpdate(tree: SpatialTreeItem | null): void {
    this._tree = tree
    this.onSpatialStructureCreated.trigger({ tree: this.cloneSpatialTree(tree) })
  }

  private cloneSpatialTree(tree: SpatialTreeItem | null): SpatialTreeItem | null {
    if (!tree) {
      return null
    }

    return {
      name: tree.name,
      localId: tree.localId,
      ifcCategory: tree.ifcCategory,
      children: tree.children.map((child) => this.cloneSpatialTree(child) as SpatialTreeItem),
    }
  }

  private async yieldToBrowser(): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
  }

  private async transformSpatialStructure(rawStructure: any, model: any, modelId: string): Promise<SpatialTreeItem | null> {
    if (!rawStructure) {
      return null
    }

    const localIdsNeedingNames = new Set<number>()
    this.collectLocalIdsNeedingNames(rawStructure, localIdsNeedingNames)

    const nameByLocalId = new Map<number, string>()
    if (localIdsNeedingNames.size > 0) {
      try {
        const localIds = [...localIdsNeedingNames]
        const itemData = await model.getItemsData(localIds, {
          attributesDefault: false,
          attributes: ['Name'],
        })

        for (let i = 0; i < itemData.length; i++) {
          const data = itemData[i]
          const localId = localIds[i]
          const name = data?.Name?.value
          if (localId !== undefined && typeof name === 'string' && name.trim()) {
            nameByLocalId.set(localId, name)
          }
        }
      } catch (error) {
        console.warn('Failed to batch spatial-structure names:', error)
      }
    }

    // Find the building first
    const building = this.findBuilding(rawStructure)
    if (!building) {
      console.warn('No IFCBUILDING found in spatial structure')
      return null
    }

    const childrenSource = this.getRenderableChildren(building)
    const children: SpatialTreeItem[] = childrenSource.map((child) => this.createSpatialNode(child, nameByLocalId))
    const root: SpatialTreeItem = {
      name: 'Root',
      children,
    }

    if (children.length === 0) {
      this.emitSpatialStructureUpdate(root)
      return root
    }

    this.emitSpatialStructureUpdate(root)
    await this.yieldToBrowser()

    let frontier: Array<{ source: any; target: SpatialTreeItem }> = children.map((target, index) => ({
      source: childrenSource[index],
      target,
    }))

    while (frontier.length > 0) {
      const nextFrontier: Array<{ source: any; target: SpatialTreeItem }> = []

      for (const { source, target } of frontier) {
        const sourceChildren = this.getRenderableChildren(source)
        const nextChildren = sourceChildren.map((child) => this.createSpatialNode(child, nameByLocalId))
        target.children = nextChildren

        for (let i = 0; i < nextChildren.length; i++) {
          nextFrontier.push({ source: sourceChildren[i], target: nextChildren[i] })
        }
      }

      this.emitSpatialStructureUpdate(root)
      await this.yieldToBrowser()
      frontier = nextFrontier
    }

    return root
  }

  private collectLocalIdsNeedingNames(item: any, localIds: Set<number>): void {
    if (!item) {
      return
    }

    if (item?.localId && !item?.Name?.value && !item?.category && !item?.type) {
      localIds.add(item.localId)
    }

    if (Array.isArray(item)) {
      for (const child of item) {
        this.collectLocalIdsNeedingNames(child, localIds)
      }
      return
    }

    if (item?.children) {
      for (const child of item.children) {
        this.collectLocalIdsNeedingNames(child, localIds)
      }
    }
  }

  private getRenderableChildren(item: any): any[] {
    const children = Array.isArray(item?.children) ? item.children : []
    const flattened: any[] = []

    for (const child of children) {
      if (child?.category === 'IFCBUILDINGSTOREY' || child?.type === 'IFCBUILDINGSTOREY') {
        if (Array.isArray(child.children)) {
          flattened.push(...child.children)
        }
      } else {
        flattened.push(child)
      }
    }

    return flattened
  }

  private findBuilding(item: any): any {
    if (!item) return null
    
    // Check if current item is a building
    if (item?.category === 'IFCBUILDING' || item?.type === 'IFCBUILDING') {
      return item
    }
    
    // Search in children if it's an array
    if (Array.isArray(item)) {
      for (const child of item) {
        const found = this.findBuilding(child)
        if (found) return found
      }
    }
    
    // Search in children property
    if (item?.children) {
      for (const child of item.children) {
        const found = this.findBuilding(child)
        if (found) return found
      }
    }
    
    return null
  }

  private createSpatialNode(item: any, nameByLocalId: Map<number, string>): SpatialTreeItem {
    // Get item name
    let name = 'Unknown'
    if (item?.Name?.value) {
      name = item.Name.value
    } else if (item?.category || item?.type) {
      name = item.category || item.type
    } else if (item?.localId && nameByLocalId.has(item.localId)) {
      name = nameByLocalId.get(item.localId) || `Item ${item.localId}`
    } else if (item?.localId) {
      name = `Item ${item.localId}`
    }

    const result: SpatialTreeItem = {
      name: String(name),
      children: [],
    }

    if (item?.category) result.ifcCategory = item.category
    if (item?.localId) result.localId = item.localId

    return result
  }
}
