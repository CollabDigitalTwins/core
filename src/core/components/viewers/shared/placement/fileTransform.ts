// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { SourceUpAxis } from '../../../../types/dbTypes'

import type { DbFile } from '../../../../types/dbTypes'
import type { PointCloudPlacement } from '../pointcloud/pointCloudPlacement'

export type FileTransformColumns = Pick<DbFile,
  'fileTransformX' | 'fileTransformY' | 'fileTransformZ' |
  'fileRotationX' | 'fileRotationY' | 'fileRotationZ' |
  'fileScale' | 'fileSourceUp'>

function finiteOr(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function hasFileTransform(file: FileTransformColumns): boolean {
  return file.fileTransformX != null && file.fileTransformY != null && file.fileTransformZ != null
}

/** A file's scene transform from its typed columns; any column left null takes `fallback`'s value. */
export function readFileTransform(file: FileTransformColumns, fallback: PointCloudPlacement): PointCloudPlacement {
  const [px, py, pz] = fallback.position
  const [rx, ry, rz] = fallback.rotation
  const scale = finiteOr(file.fileScale, fallback.scale)
  return {
    position: [finiteOr(file.fileTransformX, px), finiteOr(file.fileTransformY, py), finiteOr(file.fileTransformZ, pz)],
    rotation: [finiteOr(file.fileRotationX, rx), finiteOr(file.fileRotationY, ry), finiteOr(file.fileRotationZ, rz)],
    scale: scale > 0 ? scale : fallback.scale,
    sourceUp: file.fileSourceUp === SourceUpAxis.y || file.fileSourceUp === SourceUpAxis.z ? file.fileSourceUp : fallback.sourceUp,
  }
}

/** The column patch that stores `placement`; fields it omits stay untouched. */
export function fileTransformPatch(placement: Partial<PointCloudPlacement>): Partial<DbFile> {
  const patch: Partial<DbFile> = {}
  if (placement.position) [patch.fileTransformX, patch.fileTransformY, patch.fileTransformZ] = placement.position
  if (placement.rotation) [patch.fileRotationX, patch.fileRotationY, patch.fileRotationZ] = placement.rotation
  if (placement.scale !== undefined) patch.fileScale = placement.scale
  if (placement.sourceUp) patch.fileSourceUp = placement.sourceUp as SourceUpAxis
  return patch
}
