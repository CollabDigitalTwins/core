'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { Source, Layer, Marker } from 'react-map-gl/maplibre'
import type { LayerProps } from 'react-map-gl/maplibre'
import type { MapGeoJSONFeature } from 'maplibre-gl'
import { toast } from 'sonner'

import {
  MapContext,
  usePermissions,
  useMenusContext,
  useMapSitesContext,
} from '../../../../../../../store'
import { MapLayerClickPriority, type ClickCallback } from '../../../../utils/MapEventManager/MapClickManager'
import { ViewerNames, type Site } from '../../../../../../../types/dbTypes'
import { useSite, useDeleteSite } from '../../../../../../../hooks/sites/sites'
import { useDeleteFile } from '../../../../../../../hooks/files/files'
import { polygonCentroid, uploadGeoJsonToAsset, pointToSegmentDistance } from './siteGeometry'
import { SiteContextMenu } from './SiteContextMenu'

const SITE_FILL_ID = 'site-fill'
const SITE_OUTLINE_ID = 'site-outline'
const SITE_LABEL_ID = 'site-label'

// How close (screen px) a click must be to count as "on a vertex" / "on an edge".
const VERTEX_HIT_PX = 12
const EDGE_HIT_PX = 8
// A polygon needs at least 3 corners; deleting below that is blocked.
const MIN_RING_POINTS = 3

const fillLayer: LayerProps = {
  id: SITE_FILL_ID,
  type: 'fill',
  paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.35 },
  filter: ['==', ['get', 'type'], 'site'],
}

const outlineLayer: LayerProps = {
  id: SITE_OUTLINE_ID,
  type: 'line',
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: { 'line-color': '#1c4587', 'line-width': 2 },
  filter: ['==', ['get', 'type'], 'site'],
}

const labelLayer: LayerProps = {
  id: SITE_LABEL_ID,
  type: 'symbol',
  layout: {
    'text-field': ['get', 'name'],
    'text-font': ['Inter'],
    'text-size': 16,
    'text-anchor': 'center',
    'text-allow-overlap': false,
  },
  paint: {
    'text-color': '#ffffff',
    'text-halo-color': '#000000',
    'text-halo-width': 1.5,
  },
  filter: ['==', ['get', 'type'], 'site-label'],
}

export const SiteLayer = () => {
  const { state: mapState } = React.useContext(MapContext)
  const { map, mapClickManager } = mapState.map
  const { state: mapSitesState, dispatch } = useMapSitesContext()
  const { sites, editingSiteId } = mapSitesState.mapSites

  const { ability } = usePermissions()
  const canUpdate = ability.can('update', 'Site')
  const canDelete = ability.can('delete', 'Site')
  const canRead = ability.can('read', 'Site')

  const { dispatch: menusDispatch, setSelectedSite, setView } = useMenusContext()

  const [menu, setMenu] = React.useState<{ x: number, y: number, siteId: number } | null>(null)

  // The site the user is currently acting on (menu open) or editing.
  const activeSiteId = menu?.siteId ?? editingSiteId ?? null
  const { updateSite } = useSite(activeSiteId ? String(activeSiteId) : '')
  const { deleteSite } = useDeleteSite(activeSiteId ?? undefined)
  const { deleteFile } = useDeleteFile(undefined, activeSiteId ?? undefined)

  const menuSite = menu ? sites.find(s => s.id === menu.siteId) ?? null : null

  // Live mirrors so the once-bound map click handlers read current values.
  const sitesRef = React.useRef(sites)
  sitesRef.current = sites
  const editingSiteIdRef = React.useRef(editingSiteId)
  editingSiteIdRef.current = editingSiteId

  // Build the rendered FeatureCollection: a polygon + a single centroid label
  // per shown site.
  const featureCollection = React.useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = []
    for (const s of sites) {
      if (s.ring.length < 3) continue
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[...s.ring, s.ring[0]]] },
        properties: { type: 'site', siteId: s.id, name: s.name },
      })
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: polygonCentroid(s.ring) },
        properties: { type: 'site-label', siteId: s.id, name: s.name },
      })
    }
    return { type: 'FeatureCollection', features }
  }, [sites])

  // Lowest-priority click handler: opens the site menu only when no other
  // interactive layer was hit at the click point.
  React.useEffect(() => {
    if (!map || !mapClickManager) return

    const handleSiteClick: ClickCallback = (e, features: MapGeoJSONFeature[]) => {
      // While editing a shape, fill clicks are for adding vertices (see the
      // edit-click effect), not for (re)opening the menu.
      if (editingSiteIdRef.current != null) return
      const feature = features?.[0]
      const siteId = Number(feature?.properties?.siteId)
      if (!siteId || Number.isNaN(siteId)) return
      const native = e.originalEvent as MouseEvent | undefined
      setMenu({
        x: native?.clientX ?? e.point.x,
        y: native?.clientY ?? e.point.y,
        siteId,
      })
    }

    const onEnter = () => { map.getCanvas().style.cursor = 'pointer' }
    const onLeave = () => { map.getCanvas().style.cursor = '' }

    mapClickManager.register(SITE_FILL_ID, MapLayerClickPriority.SiteLayerClickPriority, handleSiteClick)
    map.on('mouseenter', SITE_FILL_ID, onEnter)
    map.on('mouseleave', SITE_FILL_ID, onLeave)

    return () => {
      mapClickManager.unregister(SITE_FILL_ID)
      map.off('mouseenter', SITE_FILL_ID, onEnter)
      map.off('mouseleave', SITE_FILL_ID, onLeave)
    }
  }, [map, mapClickManager])

  const updateVertex = (index: number, lng: number, lat: number) => {
    if (editingSiteId == null) return
    const s = sites.find(x => x.id === editingSiteId)
    if (!s) return
    const ring = s.ring.map((p, i) => (i === index ? [lng, lat] as [number, number] : p))
    dispatch({ type: 'UPDATE_SITE_RING', payload: { id: editingSiteId, ring } })
  }

  // Double-click a vertex to delete it (a polygon keeps at least 3 corners).
  const deleteVertex = (index: number) => {
    if (editingSiteId == null) return
    const s = sites.find(x => x.id === editingSiteId)
    if (!s) return
    if (s.ring.length <= MIN_RING_POINTS) {
      toast.warning('A site needs at least 3 points.')
      return
    }
    const ring = s.ring.filter((_, i) => i !== index)
    dispatch({ type: 'UPDATE_SITE_RING', payload: { id: editingSiteId, ring } })
  }

  // While editing, a click on an edge (not a vertex) inserts a new vertex there.
  React.useEffect(() => {
    if (!map || editingSiteId == null) return

    const onEditClick = (e: maplibregl.MapMouseEvent) => {
      const site = sitesRef.current.find(s => s.id === editingSiteId)
      const ring = site?.ring
      if (!ring || ring.length < 2) return

      const click = e.point
      // Ignore clicks on/near an existing vertex — those drag (or, on a
      // double-click, delete) via the markers.
      for (const v of ring) {
        const vp = map.project(v as [number, number])
        if (Math.hypot(vp.x - click.x, vp.y - click.y) <= VERTEX_HIT_PX) return
      }

      // Find the nearest edge segment in screen space.
      let bestDist = Infinity
      let bestIdx = -1
      for (let i = 0; i < ring.length; i++) {
        const a = map.project(ring[i] as [number, number])
        const b = map.project(ring[(i + 1) % ring.length] as [number, number])
        const d = pointToSegmentDistance(click.x, click.y, a.x, a.y, b.x, b.y)
        if (d < bestDist) { bestDist = d; bestIdx = i }
      }

      if (bestIdx >= 0 && bestDist <= EDGE_HIT_PX) {
        const next = [...ring]
        next.splice(bestIdx + 1, 0, [e.lngLat.lng, e.lngLat.lat])
        dispatch({ type: 'UPDATE_SITE_RING', payload: { id: editingSiteId, ring: next } })
      }
    }

    // Avoid the map zooming when a vertex is double-clicked to delete it.
    map.doubleClickZoom.disable()
    map.on('click', onEditClick)
    return () => {
      map.off('click', onEditClick)
      map.doubleClickZoom.enable()
    }
  }, [map, editingSiteId, dispatch])

  const handleRename = async (name: string) => {
    if (!menu) return
    dispatch({ type: 'UPDATE_SITE_NAME', payload: { id: menu.siteId, name } })
    try {
      await updateSite({ siteName: name })
    }
    catch {
      toast.error('Failed to rename the site.')
    }
  }

  const handleToggleEdit = async () => {
    if (editingSiteId === activeSiteId && activeSiteId != null) {
      // Finishing an edit: persist the new geometry + centroid.
      const s = sites.find(x => x.id === activeSiteId)
      dispatch({ type: 'SET_EDITING_SITE', payload: { id: null } })
      if (s?.assetId && s.ring.length >= 3) {
        const toastId = toast.loading('Saving site shape…')
        try {
          await uploadGeoJsonToAsset(s.assetId, s.ring, s.name)
          const c = polygonCentroid(s.ring)
          await updateSite({ siteLongitude: c[0], siteLatitude: c[1] })
          toast.success('Site shape saved.', { id: toastId })
        }
        catch {
          toast.error('Failed to save the site shape.', { id: toastId })
        }
      }
    }
    else {
      // Keep the menu open so the name can be edited alongside the vertices.
      dispatch({ type: 'SET_EDITING_SITE', payload: { id: activeSiteId } })
    }
  }

  const handleHide = () => {
    if (!menu) return
    dispatch({ type: 'HIDE_SITE', payload: { id: menu.siteId } })
    setMenu(null)
  }

  const handleInfo = () => {
    if (!menu) return
    const s = sites.find(x => x.id === menu.siteId)
    setSelectedSite({ id: menu.siteId, siteName: s?.name } as Site)
    setView('detail')
    menusDispatch({ type: 'SET_VIEWER', payload: { currentViewer: ViewerNames.sites } })
    setMenu(null)
  }

  const handleDelete = async () => {
    if (!menu) return
    const id = menu.siteId
    const s = sites.find(x => x.id === id)
    try {
      await deleteSite(id)
      if (s?.fileId) {
        try { await deleteFile(s.fileId) }
        catch { /* geometry file orphaned; site itself is gone */ }
      }
      dispatch({ type: 'HIDE_SITE', payload: { id } })
      setMenu(null)
      toast.success('Site deleted.')
    }
    catch {
      toast.error('Failed to delete the site.')
    }
  }

  const editingSite = editingSiteId != null ? sites.find(s => s.id === editingSiteId) ?? null : null

  return (
    <>
      <Source id="sites-source" type="geojson" data={featureCollection}>
        <Layer {...fillLayer} />
        <Layer {...outlineLayer} />
        <Layer {...labelLayer} />
      </Source>

      {/* Draggable vertex handles while editing a site's shape */}
      {editingSite?.ring.map((vertex, index) => (
        <Marker
          key={`${editingSite.id}-vertex-${index}`}
          longitude={vertex[0]}
          latitude={vertex[1]}
          draggable
          onDrag={(e: { lngLat: { lng: number, lat: number } }) =>
            updateVertex(index, e.lngLat.lng, e.lngLat.lat)}
        >
          <div
            title="Drag to move · double-click to delete"
            onDoubleClick={(ev) => { ev.stopPropagation(); deleteVertex(index) }}
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#22c55e',
              border: '2px solid #ffffff',
              boxShadow: '0 0 0 1px #15803d',
              cursor: 'grab',
            }}
          />
        </Marker>
      ))}

      {menu && menuSite && (
        <SiteContextMenu
          x={menu.x}
          y={menu.y}
          site={menuSite}
          isEditing={editingSiteId === menu.siteId}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canRead={canRead}
          onClose={() => setMenu(null)}
          onRename={handleRename}
          onToggleEdit={handleToggleEdit}
          onHide={handleHide}
          onInfo={handleInfo}
          onDelete={handleDelete}
        />
      )}
    </>
  )
}
