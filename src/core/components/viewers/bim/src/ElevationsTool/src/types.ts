// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type * as OBC from '@thatopen/components'
import type * as THREE from 'three'
import type { DrawingLayerInfo } from '../../lib/drawingLayers'
import type { ViewLoadingState } from '../../lib/viewSection'

export type ElevationDirection = 'north' | 'south' | 'east' | 'west'

export interface ElevationEntry {
  id: string
  /** north / south / east / west — used as a translation key by the UI. */
  direction: ElevationDirection
  modelId: string
  /** World position of the drawing plane (camera position). */
  position: THREE.Vector3
  /** Camera view direction — drawing.orientTo() value. */
  viewDirection: THREE.Vector3
  /** 2D viewport bounds for the drawing (left/right/top/bottom). */
  viewport: { left: number; right: number; top: number; bottom: number }
  /** Depth captured by the projection. */
  far: number
  /** Box used to frame the camera. */
  modelBox: THREE.Box3
  drawing: OBC.TechnicalDrawing | null
  projected: boolean
  /** Per-IFC-class layer metadata, populated after projection. The sidebar
   *  uses this to render visibility toggles + color pickers. */
  layers: DrawingLayerInfo[]
}

export const ELEVATIONS_TOOL_UUID =
  '8e2c4d1a-9b5f-4a3c-8d2e-7f6c9b1a0e3d' as const

export type ElevationLoadingStage =
  | 'init'
  | 'readingModel'
  | 'resolve'
  | 'cull'
  | 'switching'
  | 'project'
  | 'done'

export type ElevationLoadingState = ViewLoadingState<ElevationLoadingStage>

export const ELEVATION_STAGE_PERCENT: Record<ElevationLoadingStage, number> = {
  init: 5,
  readingModel: 10,
  resolve: 25,
  cull: 50,
  switching: 50,
  project: 90,
  done: 100,
}
