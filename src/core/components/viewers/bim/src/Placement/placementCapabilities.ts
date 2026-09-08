// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { FULL_PLACEMENT, SCALABLE_OBJECT_PLACEMENT, YAW_ONLY_PLACEMENT } from './placementTarget'

import type { PlacementCapabilities } from './placementTarget'
import type { DbFile } from '../../../../../types/dbTypes'

const POINT_CLOUD = new Set(['laz', 'las'])
const SCALABLE_OBJECT = new Set(['glb', 'gltf', 'fbx', 'obj', '3ds', 'dae', 'ply', 'stl', 'dxf'])
const SURVEYED = new Set([...POINT_CLOUD, 'ifc', 'frag'])

/**
 * What a file's placement is allowed to change, decided in one place so the card, the viewport
 * menu and the adapters cannot disagree about it.
 */
export function capabilitiesForFile(file: Pick<DbFile, 'extension'>): PlacementCapabilities {
  const extension = file.extension?.toLowerCase() ?? ''

  if (POINT_CLOUD.has(extension)) return FULL_PLACEMENT
  if (SCALABLE_OBJECT.has(extension)) return SCALABLE_OBJECT_PLACEMENT
  return YAW_ONLY_PLACEMENT
}

/** A survey of the whole building already carries its own coordinates, so picking a spot for it is meaningless. */
export function dropsAtOrigin(file: Pick<DbFile, 'extension'>): boolean {
  return SURVEYED.has(file.extension?.toLowerCase() ?? '')
}
