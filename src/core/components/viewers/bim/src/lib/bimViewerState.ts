// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export type BimViewerState = 'opening' | 'loading' | 'ready' | 'error' | 'noBimFiles' | 'noBuilding' | 'filesUnavailable'

export interface BimViewerStateInputs {
  hasComponents: boolean
  hasBuildingId: boolean
  hasBuilding: boolean
  buildingLoading: boolean
  buildingError: boolean
  filesLoading: boolean
  filesError: boolean
  bimFileCount: number
  hasLoadedModels: boolean
}

export interface BimViewerTransition {
  state: BimViewerState
  resetLoadedModels?: boolean
  loadModels?: boolean
}

/**
 * Decides what the loading card should show. Returns null to leave the current state alone.
 */
export function nextBimViewerState(inputs: BimViewerStateInputs): BimViewerTransition | null {
  const { hasComponents, hasBuilding, hasBuildingId, bimFileCount } = inputs

  if (!hasComponents) return { state: 'opening', resetLoadedModels: true }
  if (inputs.buildingLoading) return { state: 'opening' }
  if (inputs.buildingError || (!hasBuildingId && !hasBuilding)) return { state: 'noBuilding', resetLoadedModels: true }
  if (hasBuilding && inputs.filesLoading) return { state: 'opening' }
  if (inputs.hasLoadedModels) return null
  if (!hasBuilding) return null

  if (bimFileCount > 0) return { state: 'loading', loadModels: true }
  // An empty list after a failed fetch means the request died, not that the building is empty.
  if (inputs.filesError) return { state: 'filesUnavailable' }
  return { state: 'noBimFiles' }
}
