// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export const DEFAULT_POINTCLOUD_API_BASE = 'http://localhost:5101'

/** Single home for the point-cloud service base; empty settings degrade to the local default. */
export function resolvePointCloudApiBase(configured: string | undefined | null): string {
  const trimmed = configured?.trim()
  if (!trimmed) return DEFAULT_POINTCLOUD_API_BASE
  return trimmed.replace(/\/+$/, '')
}

export function pointCloudMetadataUrl(apiBase: string, fileId: string): string {
  return `${apiBase}/point-cloud/${encodeURIComponent(fileId)}`
}

/** potree-core loads by file name plus a directory, so the stored key is split in two. */
export function pointCloudOctreeSource(
  apiBase: string,
  bucket: string,
  metadataFileKey: string,
): { fileName: string; baseUrl: string } {
  const full = `${apiBase}/private/${bucket}/${metadataFileKey}`
  const cut = full.lastIndexOf('/')
  return { fileName: full.slice(cut + 1), baseUrl: full.slice(0, cut + 1) }
}
