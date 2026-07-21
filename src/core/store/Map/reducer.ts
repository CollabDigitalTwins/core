// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { type MapGeoJSONFeature } from 'maplibre-gl'

import type { MapClickManager } from '../../components/viewers/map/utils/MapEventManager/MapClickManager'
import type { MapHoverManager } from '../../components/viewers/map/utils/MapEventManager/MapHoverManager'
import type { CursorType } from '../../types/global'
import type {
  Coordinates,
  MapCameraPosition,
  MapStyle,
  CurrentLocation,
  TerrainLevel,
} from '../../types/map'
import type { ActionMap } from '../ActionMap'
import type { Feature, Geometry } from 'geojson'
import type { Map} from 'maplibre-gl';



export interface MapTypes {
  mapStyle: MapStyle | null
  map: Map | null
  cursor: CursorType
  currentLocation: CurrentLocation
  countrySubdivisionsData?: Record<string, string>
  organizationCountry?: string;
  markerLocation: Coordinates | null
  currentMapCameraPosition: MapCameraPosition | null
  currentUrl: string
  currentSearchParams: object
  currentStringParams: string
  geojson: string | Geometry | Feature<Geometry> | null
  addedLayers: string[]
  clickedFeature: MapGeoJSONFeature | null
  modelId: string | null
  bimModelsAddedToMap: (string | number)[]
  bimModelLoadingLocation: { modelId: string, long: number, lat: number }[]
  mapClickManager: MapClickManager
  mapHoverManager: MapHoverManager
  dimensionsColour: string;
  terrainLevel: TerrainLevel
}

export type MapState = MapTypes

export type MapPayload = {
  ['UPDATE_MAP_STYLE']: Pick<MapTypes, 'mapStyle'>
  ['UPDATE_LOCATION']: Pick<MapTypes, 'currentLocation'>
  ['SET_COUNTRY_SUBDIVISIONS']: Pick<MapTypes, 'countrySubdivisionsData' | 'organizationCountry'>
  ['UPDATE_MAP_CAMERA_POSITION']: Pick<MapTypes, 'currentMapCameraPosition'>
  ['ASSET_MARKER']: Pick<MapTypes, 'markerLocation'>
  ['SET_BOUNDARY_GEOJSON']: Pick<MapTypes, 'geojson'>
  ['SET_MAP']: Pick<MapTypes, 'map'>
  ['SET_CURSOR']: Pick<MapTypes, 'cursor'>
  ['SET_CLICKED_FEATURE']: Pick<MapTypes, 'clickedFeature'>
  ['UPDATE_URL']: void
  ['ADD_LAYER']: Pick<MapTypes, 'addedLayers'>
  ['ADD_BIM_TO_MAP']: Pick<MapTypes, 'modelId'>
  ['ADD_BIM_LOADING_LOCATION']: { modelId: string, long: number, lat: number }
  ['REMOVE_BIM_LOADING_LOCATION']: Pick<MapTypes, 'modelId'>

  ['REMOVE_BIM_FROM_MAP']: Pick<MapTypes, 'modelId'>
  ['REMOVE_ALL_BIM_MODELS']: void

  ['ADD_MAP_CLICK_MANAGER']: Pick<MapTypes, 'mapClickManager'>
  ['ADD_MAP_HOVER_MANAGER']: Pick<MapTypes, 'mapHoverManager'>
  ['UPDATE_DIMENSIONS_COLOUR']: Pick<MapTypes, 'dimensionsColour'>
  ['UPDATE_TERRAIN_LEVEL']: Pick<MapTypes, 'terrainLevel'>
}

export type MapActions = ActionMap<MapPayload>[keyof ActionMap<MapPayload>]

export const MapReducer = (state: MapState, action: MapActions) => {
  switch (action.type) {
    case 'UPDATE_MAP_STYLE':
      return {
        ...state,
        mapStyle: action.payload.mapStyle,
      }
    case 'UPDATE_LOCATION':
      const currentLocation = action.payload.currentLocation
      return {
        ...state,
        currentLocation,
      }
              case 'SET_COUNTRY_SUBDIVISIONS':
      return {
        ...state,
        countrySubdivisionsData: action.payload.countrySubdivisionsData,
        organizationCountry: action.payload.organizationCountry,
      }
    case 'UPDATE_MAP_CAMERA_POSITION':
      return {
        ...state,
        currentMapCameraPosition: action.payload.currentMapCameraPosition,
      }
    case 'ASSET_MARKER':
      return {
        ...state,
        markerLocation: action.payload.markerLocation,
      }
    case 'SET_BOUNDARY_GEOJSON':
      return {
        ...state,
        // Fix: write the real `geojson` state field. Was writing a stray
        // `boundaryGeojson` key, so the geojson never updated. (Bug found via unit
        // test; action is currently unused → zero blast radius.)
        geojson: action.payload.geojson,
      }
    case 'SET_MAP':
      return {
        ...state,
        map: action.payload.map,
      }
    case 'SET_CURSOR':
      const { cursor } = action.payload
      return {
        ...state,
        cursor,
      }
    case 'ADD_LAYER':
      const newLayers = action.payload.addedLayers.filter(
        layer => !state.addedLayers.includes(layer),
      )
      const addedLayers = [...state.addedLayers, ...newLayers]
      return {
        ...state,
        addedLayers,
      }
    case 'SET_CLICKED_FEATURE':
      return {
        ...state,
        clickedFeature: action.payload.clickedFeature,
      }
    case 'ADD_BIM_TO_MAP':
      const { modelId } = action.payload
      const bimModelsAddedToMap = state.bimModelsAddedToMap.includes(modelId)
        ? state.bimModelsAddedToMap
        : [...state.bimModelsAddedToMap, modelId]
      return {
        ...state,
        bimModelsAddedToMap,
      }
    case 'ADD_BIM_LOADING_LOCATION':
      return {
        ...state,
        bimModelLoadingLocation: [
          ...state.bimModelLoadingLocation,
          action.payload,
        ],
      }
    case 'REMOVE_BIM_LOADING_LOCATION':
      return {
        ...state,
        bimModelLoadingLocation: state.bimModelLoadingLocation.filter(
          bim => bim.modelId != action.payload.modelId,
        ),
      }
    case 'REMOVE_BIM_FROM_MAP':
      const modelIdToRemove = action.payload.modelId
      const updatedBimModelsAddedToMap = state.bimModelsAddedToMap.filter(
        modelId => modelId !== modelIdToRemove,
      )
      const updatedBimLoading = state.bimModelLoadingLocation.filter(
        bim => bim.modelId != action.payload.modelId,
      )
      return {
        ...state,
        bimModelsAddedToMap: updatedBimModelsAddedToMap,
        bimModelLoadingLocation: updatedBimLoading,
      }
    case 'REMOVE_ALL_BIM_MODELS':
      return {
        ...state,
        bimModelsAddedToMap: [],
        bimModelLoadingLocation: [],
      }
    case 'ADD_MAP_CLICK_MANAGER':
      const mapClickManager = action.payload.mapClickManager
      return {
        ...state,
        mapClickManager: mapClickManager,
      }
    case 'ADD_MAP_HOVER_MANAGER':
      const mapHoverManager = action.payload.mapHoverManager
      return {
        ...state,
        mapHoverManager: mapHoverManager,
      }
    case 'UPDATE_DIMENSIONS_COLOUR':
      return {
        ...state,
        dimensionsColour: action.payload.dimensionsColour,
      }
    case 'UPDATE_TERRAIN_LEVEL':
      return {
        ...state,
        terrainLevel: action.payload.terrainLevel,
      }
    default:
      return state
  }
}
