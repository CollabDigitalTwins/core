// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// MapClickManager.ts
import type maplibregl from 'maplibre-gl'

/**
 * This is very important. Declare a new priority for your layer in this enum if you need to,
 * otherwise, just use the one that has been declared
 * Higher priority is clicked first.
 */
export enum MapLayerClickPriority {
  BuildingLayersClickPriority = 100,
  CommentLayersClickPriority = 200,
  MartinLayerClickPriority = 300,
  OpenDataLayerClickPriority = 350,
  FileLayerCLickPriority = 400,
  BimModelLayerPriority = 600,
  ActiveTool = 1000, // SPECIAL ONE, MAKE SURE TO DISABLE THE TOOL WHEN YOU ARE FINISH.
}
export type ClickCallback = (
  event: maplibregl.MapMouseEvent,
  features: maplibregl.MapGeoJSONFeature[],
) => void

interface LayerClickHandler {
  layerId: string
  priority: number
  callback: ClickCallback
}

export class MapClickManager {
  private map: maplibregl.Map // the instance of the map
  private clickHandlers: LayerClickHandler[] // all click handlers for layers that has been registered
  private boundedClickHandler: (e: maplibregl.MapMouseEvent) => {} // clickHandler has "this" object binded to it, so inside the handleClick private function, we can still access this.map.

  constructor(map: maplibregl.Map) {
    this.map = map
    this.boundedClickHandler = this.handleMapClick.bind(this)
    this.clickHandlers = []
    this.map.on('click', this.boundedClickHandler)
  }

  public register(
    layerId: string,
    priority: MapLayerClickPriority,
    callback: ClickCallback,
  ) {
    this.clickHandlers.push({ layerId, priority, callback })
    this.clickHandlers.sort((a, b) => b.priority - a.priority)
    // console.log(this.clickHandlers)
  }

  public unregister(layerId) {
    this.clickHandlers = this.clickHandlers.filter(handler => handler.layerId !== layerId)
    // console.log(this.clickHandlers)
  }

  private handleMapClick(e: maplibregl.MapMouseEvent) {
    // for active tools
    for (const handler of this.clickHandlers) {
      if (handler.priority === MapLayerClickPriority.ActiveTool) {
        handler.callback(e, [])
        console.log('call back return ')
        return
      }
    }

    // console.log(e.point)
    const features = this.map.queryRenderedFeatures(e.point)
    // console.log(features)

    if (!features) return

    for (let i = 0; i < this.clickHandlers.length; i++) {
      const currentHandler = this.clickHandlers[i]
      const hits = features.filter(f => f.layer?.id == currentHandler.layerId)

      if (hits.length > 0) {
        // console.log(currentHandler)
        currentHandler.callback(e, hits)
        break
      }
    }
  }

  destroy() {
    this.map.off('click', this.boundedClickHandler)
    this.clickHandlers = []
  }
}
