// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import { CurrentWorld } from '../CurrentWorld'

/**
 * Hides the world grid while a drawing-based view tool is active.
 *
 * The grid is `transparent: true` (an infinite shader plane), so even when
 * positioned below the slab it can poke through via Z-fighting or because
 * the section clip doesn't always cull it. Floorplan/elevation drawings
 * are also conventionally rendered without a grid — so the cleanest fix
 * is to flip its visibility off and restore it on exit.
 *
 * Source priority for the grid reference:
 *   1. The instance injected via `setGrid(grid)` (typically from
 *      `bimState.bim.grid`, which the BimViewer dispatches at startup).
 *   2. Fallback: `OBC.Grids.list.get(world.uuid)`.
 */
export class GridController {
  private _injected: any | null = null
  private _savedVisible: boolean | null = null

  constructor(private components: OBC.Components) {}

  setGrid(grid: any | null) {
    this._injected = grid ?? null
  }

  hide() {
    if (this._savedVisible !== null) return // already hidden
    const grid = this._resolveGrid()
    if (!grid) return
    this._savedVisible = grid.config?.visible ?? grid.three?.visible ?? true
    if (grid.config) grid.config.visible = false
    if (grid.three) grid.three.visible = false
  }

  restore() {
    if (this._savedVisible === null) return
    const grid = this._resolveGrid()
    const restoreTo = this._savedVisible
    this._savedVisible = null
    if (!grid) return
    if (grid.config) grid.config.visible = restoreTo
    if (grid.three) grid.three.visible = restoreTo
  }

  private _resolveGrid(): any | null {
    if (this._injected) return this._injected
    try {
      const grids = this.components.get(OBC.Grids)
      if (!grids?.list) return null
      const sourceWorld = this.components.get(CurrentWorld).world
      if (sourceWorld) {
        const byWorld = grids.list.get(sourceWorld.uuid)
        if (byWorld) return byWorld
      }
      // Fallback: any registered grid (typically a single one per session).
      for (const grid of grids.list.values()) return grid
    } catch {
      // Grids component not registered — no-op.
    }
    return null
  }
}
