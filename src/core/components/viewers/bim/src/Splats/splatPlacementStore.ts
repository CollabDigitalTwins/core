// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { readFileTransform } from '../../../shared/placement/fileTransform'
import { DEFAULT_SPLAT_PLACEMENT } from '../../../shared/splat/splatUpAxis'
import { placementPatch, samePlacement } from '../PointClouds/pointCloudPlacementStore'

import type { FileTransformColumns } from '../../../shared/placement/fileTransform'
import type { SplatPlacement } from '../../../shared/splat/splatUpAxis'

export { placementPatch as splatPlacementPatch, samePlacement as sameSplatPlacement }

/** Splats share the point-cloud transform columns, defaulting to a splat's own up axis. */
export function readSplatPlacement(file: FileTransformColumns | undefined): SplatPlacement {
  return file ? readFileTransform(file, DEFAULT_SPLAT_PLACEMENT) : { ...DEFAULT_SPLAT_PLACEMENT }
}
