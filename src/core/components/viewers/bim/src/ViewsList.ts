import * as OBC from '@thatopen/components'
import { CurrentWorld } from './CurrentWorld'
import * as THREE from 'three'
import { CustomOBCViews } from './CustomOBCViews'

export class ViewsList extends OBC.Component {
  static uuid = '50c78913-7fcc-4b4f-8c0c-8a01447d30ed' as const

  enabled = false
  private world: OBC.World | null = null
  private _levelViews: OBC.View[] = []
  private _elevationsViews: OBC.View[] = []

  constructor(components: OBC.Components) {
    super(components)
    components.add(ViewsList.uuid, this)
    this.world = components.get(CurrentWorld).world
  }

  createFloorplanViews = async () => {
    // Try to reuse an existing Views component to avoid duplicate registration
    let views: OBC.Views
    try {
      views = this.components.get(OBC.Views)
    } catch {
      // If not present, create our custom implementation (this registers it once)
      views = new CustomOBCViews(this.components)
    }

    OBC.Views.defaultRange = 100
    views.world = this.world

    // Use available API to create storey/elevation views
    // If the instance is CustomOBCViews, it will handle unit conversion internally
    this._levelViews = await (views as any).createFromIfcStoreys?.({
      offset: 0.25,
    }) || []
    this._elevationsViews = (views as any).createElevations?.({ combine: true }) || []
  }

  set levelViews(views: OBC.View[]) {
    this._levelViews = views || []
  }

  get levelViews() {
    return this._levelViews
  }

  set elevationsViews(views: OBC.View[]) {
    this._elevationsViews = views || []
  }

  get elevationsViews() {
    return this._elevationsViews
  }
}
