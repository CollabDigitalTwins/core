// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export interface ResolvedSplat {
  url: string
  name?: string
}

/** Where a splat's bytes come from, injected so the registry can be tested without the network. */
export interface SplatSource {
  resolve(id: string): Promise<ResolvedSplat>
}

/** Splats need no conversion, so they stream straight from the file's presigned download URL. */
export function createHttpSplatSource(): SplatSource {
  return {
    async resolve(id) {
      const response = await fetch(`/api/presignedUrlDownload/${id}`)
      if (!response.ok) throw new Error(`Failed to get download URL for splat ${id}: ${response.status}`)

      const { presignedUrl } = await response.json() as { presignedUrl?: string }
      if (!presignedUrl) throw new Error(`No download URL returned for splat ${id}`)
      return { url: presignedUrl }
    },
  }
}
