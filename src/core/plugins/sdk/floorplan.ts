'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { FloorplanTool } from '../../components/viewers/bim/src/FloorplanTool'
import { readPlanFootprints } from '../../components/viewers/bim/src/FloorplanTool/src/spaceFootprints'

import type { PlanOverlayOptions, PlanOverlayShape, PlanPoint, SketchKind } from '../../components/viewers/bim/src/FloorplanTool'
import type { PlanFootprint } from '../../components/viewers/bim/src/FloorplanTool/src/spaceFootprints'
import type { ModelIdMap } from '../../components/viewers/bim/src/lib/bimTree'
import type * as OBC from '@thatopen/components'

export interface FloorplanStorey {
  /** Stable for the session: `${modelId}::${storeyName}`. */
  id: string
  name: string
  /** World height of the storey, in metres. */
  elevation: number
  modelId: string
}

/** The BIM floorplan as a plugin sees it. Coordinates are world metres on the horizontal plane. */
export interface PluginFloorplan {
  /** False in a viewer without floorplans; every method is then a no-op. */
  available: boolean
  storeys: FloorplanStorey[]
  active: FloorplanStorey | null
  isDrawing: boolean
  /** True while `editShape` is waiting for the user to finish reshaping an outline. */
  isEditingShape: boolean
  /** True once the open storey's vector lines exist; sketches snap to their corners. */
  hasLines: boolean
  activate: (storeyId: string) => Promise<void>
  deactivate: () => Promise<void>
  /** Projects the open storey's vector lines. Slow on large models, so it is a separate step. */
  generateLines: () => Promise<void>
  /** Fits the open plan's view to an outline, such as a space's, with some margin around it. */
  frame: (points: readonly PlanPoint[]) => Promise<void>
  /** Resolves with the drawn outline, or null when cancelled or no plan is open. */
  drawShape: (kind: SketchKind) => Promise<PlanPoint[] | null>
  /**
   * Lets the user drag the outline's corners and edges; Ctrl+click adds a corner, Delete removes one.
   * Resolves with the new outline on Enter or `finishEditingShape`, or null when cancelled.
   */
  editShape: (points: readonly PlanPoint[]) => Promise<PlanPoint[] | null>
  finishEditingShape: () => void
  /** Cancels a drawing or a shape edit in progress. */
  cancelDrawing: () => void
  /** Replaces this plugin's shapes on the open plan. They follow whichever storey is open. */
  setOverlay: (shapes: readonly PlanOverlayShape[], options?: PlanOverlayOptions) => void
  clearOverlay: () => void
  /** Floor outlines of elements such as IFCSPACEs, for drawing them with `setOverlay`. */
  getSpaceFootprints: (items: ModelIdMap) => Promise<PlanFootprint[]>
}

interface FloorplanSnapshot {
  storeys: FloorplanStorey[]
  active: FloorplanStorey | null
  isDrawing: boolean
  isEditingShape: boolean
  hasLines: boolean
}

const EMPTY_SNAPSHOT: FloorplanSnapshot = { storeys: [], active: null, isDrawing: false, isEditingShape: false, hasLines: false }

// `list.get`, not `components.get`: the latter would create the tool in a viewer that has none.
function findTool(components: OBC.Components | null): FloorplanTool | null {
  return (components?.list.get(FloorplanTool.uuid) as FloorplanTool | undefined) ?? null
}

function toStorey(entry: { id: string; name: string; elevation: number; modelId: string }): FloorplanStorey {
  return { id: entry.id, name: entry.name, elevation: entry.elevation, modelId: entry.modelId }
}

function snapshot(tool: FloorplanTool | null): FloorplanSnapshot {
  if (!tool) return EMPTY_SNAPSHOT
  const active = tool.activeDrawing
  return {
    storeys: tool.drawings.map(toStorey),
    active: active ? toStorey(active) : null,
    isDrawing: tool.sketch.isActive,
    isEditingShape: tool.editor.isActive,
    hasLines: active?.projected ?? false,
  }
}

/** Live floorplan state plus the tool, for binding to a plugin with {@link bindPluginFloorplan}. */
export function useFloorplanSource(components: OBC.Components | null) {
  const tool = findTool(components)
  const [state, setState] = React.useState<FloorplanSnapshot>(() => snapshot(tool))

  React.useEffect(() => {
    const update = () => setState(snapshot(tool))
    update()
    if (!tool) return
    tool.onDrawingsChanged.add(update)
    tool.onActiveDrawingChanged.add(update)
    tool.sketch.onActiveChanged.add(update)
    tool.editor.onActiveChanged.add(update)
    tool.onLayersChanged.add(update)
    return () => {
      tool.onDrawingsChanged.remove(update)
      tool.onActiveDrawingChanged.remove(update)
      tool.sketch.onActiveChanged.remove(update)
      tool.editor.onActiveChanged.remove(update)
      tool.onLayersChanged.remove(update)
    }
  }, [tool])

  return React.useMemo(() => ({ tool, components, state }), [tool, components, state])
}

export type FloorplanSource = ReturnType<typeof useFloorplanSource>

/** The floorplan surface for one plugin; overlays are kept per `pluginId`. */
export function bindPluginFloorplan(source: FloorplanSource, pluginId: string): PluginFloorplan {
  const { tool, components, state } = source
  return {
    available: tool !== null,
    ...state,
    activate: async (storeyId) => { await tool?.activate(storeyId) },
    deactivate: async () => { await tool?.deactivate() },
    generateLines: async () => {
      const id = tool?.activeDrawingId
      if (id) await tool.generateLines(id)
    },
    frame: async (points) => { await tool?.framePoints(points) },
    drawShape: async kind => (tool ? tool.sketch.start(kind) : null),
    editShape: async points => (tool ? tool.editor.start(points) : null),
    finishEditingShape: () => tool?.editor.commit(),
    cancelDrawing: () => {
      tool?.sketch.cancel()
      tool?.editor.cancel()
    },
    setOverlay: (shapes, options) => tool?.overlay.set(pluginId, shapes, options),
    clearOverlay: () => tool?.overlay.clear(pluginId),
    getSpaceFootprints: async items => (components ? readPlanFootprints(components, items) : []),
  }
}

export type { PlanFootprint, PlanOverlayOptions, PlanOverlayShape, PlanPoint, SketchKind }
