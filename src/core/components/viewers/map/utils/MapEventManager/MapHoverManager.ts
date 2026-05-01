// MapClickManager.ts
import type maplibregl from 'maplibre-gl'

/**
 * This is very important. Declare a new priority for your layer in this enum if you need to,
 * otherwise, just use the one that has been declared
 * Higher priority is clicked first.
 *
 * For layers that has the same priority, the default will be the first one that is in the sorted list that is called.
 */
export enum MapLayerHoverPriority {
  BuildingLayers = 100,
  CommentLayers = 200,
  MartinLayers = 300,
  FileLayers = 400,
  BimModels = 600,
}
export type HoverCallback = (
  event: maplibregl.MapMouseEvent,
  features: maplibregl.MapGeoJSONFeature[],
) => void

interface LayerHoverHandler {
  layerId: string
  priority: number
  callback: HoverCallback
}

export class MapHoverManager {
  private map: maplibregl.Map // the instance of the map
  private hoverHandlers: LayerHoverHandler[] // all click handlers for layers that has been registered
  private boundedHoverHandler: (e: maplibregl.MapMouseEvent) => {} // clickHandler has "this" object binded to it, so inside the handleClick private function, we can still access this.map.

  constructor(map: maplibregl.Map) {
    this.map = map
    this.boundedHoverHandler = this.handleMapHover.bind(this)
    this.hoverHandlers = []
    this.map.on('mousemove', this.boundedHoverHandler)
  }

  public register(
    layerId: string,
    priority: MapLayerHoverPriority,
    callback: HoverCallback,
  ) {
    this.hoverHandlers.push({ layerId, priority, callback })
    this.hoverHandlers.sort((a, b) => b.priority - a.priority)
    // console.log(this.clickHandlers)
  }

  public unregister(layerId) {
    this.hoverHandlers = this.hoverHandlers.filter(handler => handler.layerId !== layerId)
    // console.log(this.clickHandlers)
  }

  private handleMapHover(e: maplibregl.MapMouseEvent) {
    const features = this.map.queryRenderedFeatures(e.point)
    // console.log(features)

    if (!features) return

    for (let i = 0; i < this.hoverHandlers.length; i++) {
      const currentHandler = this.hoverHandlers[i]
      const hits = features.filter(f => f.layer?.id == currentHandler.layerId)

      if (hits.length > 0) {
        // console.log(currentHandler)
        currentHandler.callback(e, hits)
        break
      }
    }
  }

  destroy() {
    this.map.off('mouseenter', this.boundedHoverHandler)
    this.hoverHandlers = []
  }
}
