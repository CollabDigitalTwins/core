// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// MapClickManager.ts
import type { PopupEntry } from '../../../../../types/map'
import type * as maplibregl from 'maplibre-gl'

/**
 * Orders the popup stack a click produces rather than picking a single winning
 * layer. `ActiveTool` is the exception and stays exclusive.
 */
export enum MapLayerClickPriority {
  // Lowest priority: a site polygon only handles a click when no other
  // interactive layer (buildings, comments, sensors, files, ...) was hit.
  SiteLayerClickPriority = 50,
  BuildingLayersClickPriority = 100,
  CommentLayersClickPriority = 200,
  MartinLayerClickPriority = 300,
  OpenDataLayerClickPriority = 350,
  FileLayerCLickPriority = 400,
  BimModelLayerPriority = 600,
  ActiveTool = 1000, // SPECIAL ONE, MAKE SURE TO DISABLE THE TOOL WHEN YOU ARE FINISH.
}

export const MAX_POPUP_ENTRIES = 10

export type ClickCallback = (
  event: maplibregl.MapMouseEvent,
  features: maplibregl.MapGeoJSONFeature[],
) => void

export type PopupResolver = (
  event: maplibregl.MapMouseEvent,
  features: maplibregl.MapGeoJSONFeature[],
) => PopupEntry[]

interface LayerClickHandler {
  layerId: string
  priority: number
  resolve?: PopupResolver
  callback?: ClickCallback
}

export class MapClickManager {
  private map: maplibregl.Map // the instance of the map
  private clickHandlers: LayerClickHandler[] // all click handlers for layers that has been registered
  private boundedClickHandler: (e: maplibregl.MapMouseEvent) => void // clickHandler has "this" object binded to it, so inside the handleClick private function, we can still access this.map.
  private publish: (entries: PopupEntry[]) => void = () => {}

  constructor(map: maplibregl.Map) {
    this.map = map
    this.boundedClickHandler = this.handleMapClick.bind(this)
    this.clickHandlers = []
    this.map.on('click', this.boundedClickHandler)
  }

  public onPopupStack(publish: (entries: PopupEntry[]) => void) {
    this.publish = publish
  }

  public register(
    layerId: string,
    priority: MapLayerClickPriority,
    resolve: PopupResolver,
  ) {
    this.add({ layerId, priority, resolve })
  }

  /** Migration bridge for layers that still own their own popup. Delete once all layers resolve entries. */
  public registerLegacy(
    layerId: string,
    priority: MapLayerClickPriority,
    callback: ClickCallback,
  ) {
    this.add({ layerId, priority, callback })
  }

  public unregister(layerId) {
    this.clickHandlers = this.clickHandlers.filter(handler => handler.layerId !== layerId)
  }

  private add(handler: LayerClickHandler) {
    this.clickHandlers.push(handler)
    // Stable, so equal priorities keep registration order across clicks.
    this.clickHandlers.sort((a, b) => b.priority - a.priority)
  }

  private handleMapClick(e: maplibregl.MapMouseEvent) {
    // for active tools
    for (const handler of this.clickHandlers) {
      if (handler.priority === MapLayerClickPriority.ActiveTool) {
        handler.callback?.(e, [])
        handler.resolve?.(e, [])
        return
      }
    }

    const features = this.map.queryRenderedFeatures(e.point)

    if (!features) return

    const entries: PopupEntry[] = []
    let resolvedAnything = false

    for (const handler of this.clickHandlers) {
      const hits = features.filter(f => f.layer?.id === handler.layerId)
      if (hits.length === 0) continue

      // A legacy handler owns its own popup and consumes the click, but only from the top: below a resolver it never fired before either.
      if (!handler.resolve) {
        if (resolvedAnything) continue
        handler.callback?.(e, hits)
        this.publish([])
        return
      }

      resolvedAnything = true
      entries.push(...handler.resolve(e, hits))
    }

    this.publish(dedupeEntries(entries).slice(0, MAX_POPUP_ENTRIES))
  }

  destroy() {
    this.map.off('click', this.boundedClickHandler)
    this.clickHandlers = []
    this.publish = () => {}
  }
}

function dedupeEntries(entries: PopupEntry[]): PopupEntry[] {
  const seen = new Set<string>()
  const ordered = [...entries].sort((a, b) => b.priority - a.priority)
  return ordered.filter(entry => {
    if (seen.has(entry.id)) return false
    seen.add(entry.id)
    return true
  })
}
