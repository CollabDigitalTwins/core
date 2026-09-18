// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { PlacementCapabilities } from './placementTarget'
import type { FileMarkerAction } from '../../../../ui/FilesManager/src/PlacementActionsCard'

export interface MarkerActionContext {
  /** Whether the loaded object carries animation clips, which no extension can tell us. */
  animated?: boolean
  /** Only a caller that can route the hide offers it; a marker with no route must not. */
  hidable?: boolean
}

/** The viewport menu offers only what the target can save, matching the placement card. */
export function markerActionsFor(
  capabilities: PlacementCapabilities,
  { animated = false, hidable = false }: MarkerActionContext = {},
): FileMarkerAction[] {
  const actions: FileMarkerAction[] = ['move', 'rotate']
  if (capabilities.scale) actions.push('scale')
  if (animated) actions.push('animate')
  if (hidable) actions.push('hide')
  return actions
}
