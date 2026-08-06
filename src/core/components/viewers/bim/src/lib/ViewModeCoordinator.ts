// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

/** Tools that take exclusive control of the viewer (FloorplanTool,
 *  ElevationsTool, …) implement this so the coordinator can switch them
 *  off when another tool claims the viewer. */
export interface ExclusiveViewTool {
  deactivate(): Promise<void> | void
}

/**
 * Single-slot mutual exclusion for drawing-based view tools. A tool calls
 * `claim(this)` at the start of its `activate()` and `release(this)` at
 * the end of its `deactivate()`. If a different tool was active, the
 * coordinator awaits its `deactivate()` first — guaranteeing only one
 * tool drives the viewer at a time.
 */
export class ViewModeCoordinator extends OBC.Component {
  static uuid = 'fc4c8b2e-2c5a-4a4f-bb1e-6d2c3f7a18b0' as const

  enabled = true

  /**
   * Fires when the viewer goes back to plain 3D, i.e. the active tool released
   * and nothing claimed the slot in its place.
   *
   * Exists because leaving a drawing view resets every highlight in the model
   * (see `CategoryHighlighter.restore`), so anything holding its own element
   * appearance has to repaint. Deliberately silent on a tool-to-tool switch:
   * `claim` records the incoming tool before awaiting the outgoing one's
   * `deactivate()`, so the outgoing `release()` no-ops here — right, because the
   * incoming tool is about to repaint anyway.
   */
  readonly onReleased = new OBC.Event<void>()

  private _active: ExclusiveViewTool | null = null

  constructor(components: OBC.Components) {
    super(components)
    components.add(ViewModeCoordinator.uuid, this)
  }

  /** Take exclusive control. If another tool was active, its
   *  `deactivate()` is awaited before this method returns. */
  async claim(tool: ExclusiveViewTool): Promise<void> {
    if (this._active === tool) return
    const prev = this._active
    // Set the new claim FIRST so prev's deactivate() can call release()
    // without un-setting our claim.
    this._active = tool
    if (prev) {
      try {
        await prev.deactivate()
      } catch (error) {
        console.warn('[ViewModeCoordinator] previous deactivate failed:', error)
      }
    }
  }

  /** Release the claim if `tool` is the active one. No-op otherwise. */
  release(tool: ExclusiveViewTool): void {
    if (this._active !== tool) return
    this._active = null
    this.onReleased.trigger()
  }
}
