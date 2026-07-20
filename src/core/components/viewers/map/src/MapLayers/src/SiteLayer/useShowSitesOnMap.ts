'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { MapContext, useMenusContext, useMapSitesContext } from '../../../../../../../store'
import { ViewerNames, type Site } from '../../../../../../../types/dbTypes'

import { ringFromGeoJson, ringBounds, type Ring } from './siteGeometry'

/**
 * Shared "show site(s) on the map" action used by the sites table row menu and
 * the "View All on Map" header button. It switches to the map viewer FIRST (so
 * the action always navigates, even if a boundary fails to load), then loads
 * each site's polygon GeoJSON from minio, hands it to the SiteLayer via the
 * MapSites store, and fits the camera to the loaded boundaries. Sites without a
 * saved boundary fall back to flying to their point.
 */
export function useShowSitesOnMap() {
  const { dispatch: mapSitesDispatch } = useMapSitesContext()
  const { dispatch: menusDispatch } = useMenusContext()
  const { state: mapState } = React.useContext(MapContext)
  const { map } = mapState.map

  return React.useCallback(async (sites: Site[], opts?: { switchViewer?: boolean }) => {
    if (opts?.switchViewer ?? true) {
      menusDispatch({ type: 'SET_VIEWER', payload: { currentViewer: ViewerNames.map } })
    }

    const valid = sites.filter(s => s?.id)
    const rings = await Promise.all(valid.map(async (site): Promise<Ring | null> => {
      try {
        const res = await fetch(`/api/files/site/${site.id}`)
        if (!res.ok) return null
        const { files } = await res.json()
        // Prefer the file tagged as the site boundary; fall back to any geojson
        // attachment so older sites (saved before tagging) still resolve.
        const geomFile = (files ?? []).find((f: any) => f.tag === 'site-geometry' && f.url)
          ?? (files ?? []).find((f: any) =>
            (f.extension === 'geojson' || (f.mimeType && String(f.mimeType).includes('geo+json'))) && f.url)
        if (!geomFile?.url) return null
        const geo = await fetch(geomFile.url).then(r => r.json())
        const ring = ringFromGeoJson(geo)
        if (!ring) return null
        mapSitesDispatch({
          type: 'SHOW_SITE',
          payload: {
            site: {
              id: site.id,
              name: site.siteName ?? 'Site',
              ring,
              assetId: geomFile.assetId,
              fileId: geomFile.id,
            },
          },
        })
        return ring
      }
      catch {
        return null
      }
    }))

    if (!map) return
    const foundRings = rings.filter((r): r is Ring => !!r)
    if (foundRings.length > 0) {
      // Fit to the combined extent of every loaded boundary.
      map.fitBounds(ringBounds(foundRings.flat() as Ring), { padding: 60, duration: 1000 })
    }
    else {
      // No boundaries found — fly to the first site that has a point.
      const pt = valid.find(s => typeof s.siteLongitude === 'number' && typeof s.siteLatitude === 'number')
      if (pt) map.flyTo({ center: [pt.siteLongitude as number, pt.siteLatitude as number], zoom: 18, duration: 1000 })
    }
  }, [map, mapSitesDispatch, menusDispatch])
}
