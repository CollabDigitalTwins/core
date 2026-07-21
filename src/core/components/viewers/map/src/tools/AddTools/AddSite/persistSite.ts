// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ringToFeatureCollection, type Ring } from '../../../MapLayers/src/SiteLayer/siteGeometry'
import { uploadToPresignedUrl } from '../AddFile/utils/uploadToPresignedURLS'

/** Tag stored on the File row so the site's boundary geojson can be found later. */
export const SITE_GEOMETRY_TAG = 'site-geometry'

export interface PersistedSite {
  siteId: number
  assetId: string
  fileId?: number
}

/**
 * Persist a freshly drawn site:
 *   1. create the DB Site (via the injected `createSite` hook trigger),
 *   2. upload the polygon GeoJSON to minio (presigned PUT),
 *   3. create a File row attached to the site that references the minio object.
 *
 * The polygon geometry lives in minio (there is no geometry column on Site);
 * the File row links it to the site via `attachedFilesSiteId` + the geometry tag.
 */
export const persistDrawnSite = async (params: {
  name: string
  ring: Ring
  centroid: [number, number]
  createSite: (arg: any) => Promise<any>
}): Promise<PersistedSite> => {
  const { name, ring, centroid, createSite } = params

  const site = await createSite({
    siteName: name,
    siteLongitude: centroid[0],
    siteLatitude: centroid[1],
  })
  const siteId = site?.id
  if (!siteId) throw new Error('Site creation did not return an id')

  const assetId = `${crypto.randomUUID()}.geojson`
  const fc = ringToFeatureCollection(ring, name)
  const file = new File([JSON.stringify(fc)], `${name || 'site'}.geojson`, {
    type: 'application/geo+json',
  })

  const presRes = await fetch(`/api/presigned-url-upload?asset=${encodeURIComponent(assetId)}`)
  if (!presRes.ok) throw new Error('Failed to get an upload URL')
  const { presignedUrl } = await presRes.json()
  await uploadToPresignedUrl(presignedUrl, file)

  const fileRes = await fetch(`/api/files/site/${siteId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'map-file',
      name: `${name || 'site'}.geojson`,
      assetId,
      mimeType: 'application/geo+json',
      extension: 'geojson',
      sizeBytes: file.size,
      tag: SITE_GEOMETRY_TAG,
      isVisible: false,
    }),
  })
  // The DB link is required: without it the boundary is orphaned in minio and
  // can never be re-shown. Treat failure as fatal so the caller can retry.
  if (!fileRes.ok) throw new Error('Failed to attach the geometry file to the site')
  const data = await fileRes.json().catch(() => null)
  const fileId: number | undefined = data?.newFile?.id

  return { siteId, assetId, fileId }
}
