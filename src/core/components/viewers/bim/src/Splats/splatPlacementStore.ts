// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { parsePlacement } from '../../../shared/pointcloud/pointCloudPlacement'
import { DEFAULT_SPLAT_PLACEMENT } from '../../../shared/splat/splatUpAxis'
import { placementPatch, samePlacement } from '../PointClouds/pointCloudPlacementStore'

import type { DbFile } from '../../../../../types/dbTypes'
import type { SplatPlacement } from '../../../shared/splat/splatUpAxis'

export { placementPatch as splatPlacementPatch, samePlacement as sameSplatPlacement }

/** Splats share `File.pointCloudTransform`: one column, one shape, two kinds of capture. */
export function readSplatPlacement(file: Pick<DbFile, 'pointCloudTransform'> | undefined): SplatPlacement {
  if (!file) return { ...DEFAULT_SPLAT_PLACEMENT }

  const stored = typeof file.pointCloudTransform === 'string'
    ? safeParse(file.pointCloudTransform)
    : file.pointCloudTransform
  if (stored === null || typeof stored !== 'object') return { ...DEFAULT_SPLAT_PLACEMENT }

  const raw = stored as Record<string, unknown>
  return {
    ...parsePlacement(stored),
    sourceUp: raw.sourceUp === 'z' ? 'z' : DEFAULT_SPLAT_PLACEMENT.sourceUp,
  }
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
