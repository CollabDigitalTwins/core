// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { pointCloudMetadataUrl, pointCloudOctreeSource } from './pointCloudApi'

export interface ResolvedPointCloud {
  fileName: string
  baseUrl: string
  name?: string
}

/** Where a cloud's octree lives. Injected so the scene component can be tested without a service. */
export interface PointCloudSource {
  resolve(fileId: string): Promise<ResolvedPointCloud>
}

type FetchLike = (input: string) => Promise<Response>

export function createHttpPointCloudSource(
  apiBase: string,
  fetchImpl: FetchLike = (url) => fetch(url),
): PointCloudSource {
  return {
    async resolve(fileId) {
      const response = await fetchImpl(pointCloudMetadataUrl(apiBase, fileId))
      if (!response.ok) {
        throw new Error(`Point cloud ${fileId} could not be read (${response.status})`)
      }

      const record = (await response.json()) as { bucket?: string; potreeMetadataFileKey?: string; name?: string }
      if (!record.bucket || !record.potreeMetadataFileKey) {
        throw new Error(`Point cloud ${fileId} is not converted yet`)
      }

      return {
        ...pointCloudOctreeSource(apiBase, record.bucket, record.potreeMetadataFileKey),
        name: record.name,
      }
    },
  }
}
