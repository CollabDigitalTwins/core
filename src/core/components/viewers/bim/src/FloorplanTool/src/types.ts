// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { DrawingLayerInfo } from '../../lib/drawingLayers'
import type * as OBC from '@thatopen/components'

export interface FloorplanEntry {
  id: string
  name: string
  elevation: number
  storeyLocalId: number
  modelId: string
  drawing: OBC.TechnicalDrawing | null
  projected: boolean
  /** Per-IFC-class layer metadata, populated after projection. The sidebar
   *  uses this to render visibility toggles + color pickers. */
  layers: DrawingLayerInfo[]
}

export const FLOORPLAN_TOOL_UUID =
  '6d1f9c2a-4b8e-4d3a-a7c6-1e5f8b9d0a2c' as const

export const FLOORPLAN_FILL_CATEGORIES = [
  /IFCSLAB/,
  /IFCROOF/,
  /IFCCOVERING/,
]
export const FLOORPLAN_CUT_CATEGORIES = [
  /IFCWALL/,
  /IFCCURTAINWALL/,
  /IFCPLATE/,
  /IFCMEMBER/,
  /IFCCOLUMN/,
  /IFCBEAM/,
  /IFCSTAIR/,
  /IFCSTAIRFLIGHT/,
  /IFCFOOTING/,
]
export const FILL_COLOR = 0xffffff
export const CUT_COLOR = 0x444444
