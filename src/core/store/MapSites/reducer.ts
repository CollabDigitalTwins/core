// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ActionMap } from '../ActionMap'

/**
 * A site polygon currently shown on the map. The polygon geometry itself is
 * persisted as a GeoJSON file in minio (referenced by `assetId`/`fileId`); this
 * is the in-memory representation that drives the SiteLayer rendering.
 */
export interface ShownSite {
  /** DB site id */
  id: number
  name: string
  /** Outer ring vertices [lng, lat], open (no repeated closing point) */
  ring: [number, number][]
  /** minio object key of the geometry geojson, for re-upload when edited */
  assetId?: string
  /** DB file id of the geometry geojson, for deletion */
  fileId?: number
}

export interface MapSitesState {
  /** Sites currently rendered on the map. */
  sites: ShownSite[]
  /** Site whose vertices are currently being dragged/edited, if any. */
  editingSiteId: number | null
}

export type MapSitesPayload = {
  ['SHOW_SITE']: { site: ShownSite }
  ['HIDE_SITE']: { id: number }
  ['UPDATE_SITE_RING']: { id: number, ring: [number, number][] }
  ['UPDATE_SITE_NAME']: { id: number, name: string }
  ['SET_SITE_GEOMETRY_REF']: { id: number, assetId?: string, fileId?: number }
  ['SET_EDITING_SITE']: { id: number | null }
  ['CLEAR_SITES']: undefined
}

export type MapSitesActions
  = ActionMap<MapSitesPayload>[keyof ActionMap<MapSitesPayload>]

export const initialMapSitesState: MapSitesState = {
  sites: [],
  editingSiteId: null,
}

export const MapSitesReducer = (
  state: MapSitesState,
  action: MapSitesActions,
): MapSitesState => {
  switch (action.type) {
    case 'SHOW_SITE': {
      const { site } = action.payload!
      const others = state.sites.filter(s => s.id !== site.id)
      return { ...state, sites: [...others, site] }
    }
    case 'HIDE_SITE': {
      const { id } = action.payload!
      return {
        ...state,
        sites: state.sites.filter(s => s.id !== id),
        editingSiteId: state.editingSiteId === id ? null : state.editingSiteId,
      }
    }
    case 'UPDATE_SITE_RING': {
      const { id, ring } = action.payload!
      return {
        ...state,
        sites: state.sites.map(s => (s.id === id ? { ...s, ring } : s)),
      }
    }
    case 'UPDATE_SITE_NAME': {
      const { id, name } = action.payload!
      return {
        ...state,
        sites: state.sites.map(s => (s.id === id ? { ...s, name } : s)),
      }
    }
    case 'SET_SITE_GEOMETRY_REF': {
      const { id, assetId, fileId } = action.payload!
      return {
        ...state,
        sites: state.sites.map(s => (s.id === id ? { ...s, assetId, fileId } : s)),
      }
    }
    case 'SET_EDITING_SITE': {
      const { id } = action.payload!
      return { ...state, editingSiteId: id }
    }
    case 'CLEAR_SITES':
      return { ...state, sites: [], editingSiteId: null }
    default:
      return state
  }
}
