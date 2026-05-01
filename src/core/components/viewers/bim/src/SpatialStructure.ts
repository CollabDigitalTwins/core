import * as OBC from '@thatopen/components'

export interface SpatialTreeItem {
  name: string
  children: SpatialTreeItem[]
  localId?: number
  ifcCategory?: string | null
}

export class SpatialStructure extends OBC.Component {
  static readonly uuid = '8f7e4d2c-1a9b-4e6f-8c3d-5b2a9f7e4d2c' as const

  enabled = true

  // Event that fires when spatial structure is created
  readonly onSpatialStructureCreated = new OBC.Event<{ tree: SpatialTreeItem | null }>()

  // Event that fires when loading state changes
  readonly onLoadingStateChanged = new OBC.Event<{ isLoading: boolean }>()

  private fragments: OBC.FragmentsManager | null = null
  
  private _tree: SpatialTreeItem | null = null
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

  async getSpatialStructure(modelId: string): Promise<SpatialTreeItem | null> {
    if (!this.fragments || !modelId) {
      throw new Error('No fragments or modelId available')
    }

    this.setLoadingState(true)

    try {
      const model = this.fragments.list.get(modelId)
      if (!model) {
        throw new Error(`Model with ID ${modelId} not found in fragments.`)
      }

      const structure = await model.getSpatialStructure()

      const transformedStructure = await this.transformSpatialStructure(structure, model)

      // console.log('Transformed spatial structure:', transformedStructure)

      // Set the current spatial structure
      this._tree = transformedStructure

      // Trigger the event that spatial structure is created
      this.onSpatialStructureCreated.trigger({ tree: transformedStructure })

      return transformedStructure
    }
    catch (error) {
      console.error('Error getting spatial structure:', error)
      this._tree = null
      this.onSpatialStructureCreated.trigger({ tree: null })
      return null
    }
    finally {
      this.setLoadingState(false)
    }
  }

  /**
   * Clear the current spatial structure
   */
  clearSpatialStructure(): void {
    this._tree = null
    this.setLoadingState(false)
    this.onSpatialStructureCreated.trigger({ tree: null })
  }

  private async transformSpatialStructure(rawStructure: any, model: any): Promise<SpatialTreeItem | null> {
    if (!rawStructure) {
      return null
    }

    // Find the building first
    const building = this.findBuilding(rawStructure)
    if (!building) {
      console.warn('No IFCBUILDING found in spatial structure')
      return null
    }

    // Instead of returning the building itself, return its children directly
    const children: SpatialTreeItem[] = []
    if (building?.children) {
      for (const child of building.children) {
        const transformedChild = await this.transformItem(child, model)
        children.push(transformedChild)
      }
    }

    // Return a root item that contains all the building's children
    return {
      name: 'Root',
      children
    }
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

  private async transformItem(item: any, model: any): Promise<SpatialTreeItem> {
    // Get item name
    let name = 'Unknown'
    if (item?.Name?.value) {
      name = item.Name.value
    } else if (item?.category || item?.type) {
      name = item.category || item.type
    } else if (item?.localId && model) {
      try {
        const itemData = await model.getItemsData([item.localId])
        if (itemData && itemData[0]?.Name?.value) {
          name = itemData[0].Name.value
        } else {
          name = `Item ${item.localId}`
        }
      } catch (error) {
        console.warn('Failed to get item data:', error)
        name = `Item ${item.localId}`
      }
    }

    // Process children, skipping IFCBUILDINGSTOREY containers
    const children: SpatialTreeItem[] = []
    if (item?.children) {
      for (let i = 0; i < item.children.length; i++) {
        const child = item.children[i]
        
        // Skip building storey containers and add their children directly
        if (child?.category === 'IFCBUILDINGSTOREY' || child?.type === 'IFCBUILDINGSTOREY') {
          if (child.children) {
            for (const grandChild of child.children) {
              const transformedChild = await this.transformItem(grandChild, model)
              children.push(transformedChild)
            }
          }
        } else {
          const transformedChild = await this.transformItem(child, model)
          children.push(transformedChild)
        }
      }
    }

    const result: SpatialTreeItem = {
      name: String(name),
      children,
    }

    if (item?.category) result.ifcCategory = item.category
    if (item?.localId) result.localId = item.localId

    return result
  }
}
