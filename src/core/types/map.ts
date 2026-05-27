import type { JSX } from 'react'
import { LngLatBounds, LngLatBoundsLike } from 'maplibre-gl'
import { Feature } from 'geojson'

export interface MapStyle {
  name: string
  url: string
}
export interface LngLat {
  lng?: number
  long?: number
  longitude?: number
  lat?: number
  latitude?: number
}
export interface PopupInfo extends LngLat {
  feature: JSX.Element
}

export type BoundingBox = number[] | LngLatBounds | LngLatBoundsLike

export interface Coordinates extends LngLat {
  altitude?: number
  rotation?: number
  bbox?: BoundingBox
}

export interface Location extends Coordinates {
  country?: 'CA'
  countrySubdivision: string
  municipality: string
  address?: string
  site: string
  id: string
  postalCode?: string
  dtUrl?: string
  geojson?: any
}

export interface Camera {
  zoom: number
  bearing: number
  pitch: number
}
export interface MapCameraPosition extends Coordinates, Camera { }

export interface CurrentLocation extends Location, Partial<Camera> {
  sharedCamera?: boolean
  rotation?: number
}

export interface FeatureLayer {
  id: string
  name: string
  url: string
  description: string
  added: boolean
  datastore: boolean
  type?: string | undefined
  maxRecordCount?: number
  service?: string
  xmlUrl?: string
}

export interface GeoJsonFeatureCollection {
  type: string
  features: Feature[]
}

export type ColorRangeProperty = {
  name: string
  minColor?: string
  maxColor?: string
  minValue: number
  maxValue: number
}

export type GeoJsonLayerProperty = {
  name: string
  geojson: GeoJsonFeatureCollection
  color: string
  layerType: string
  keys: string[]
  colorRangeProperties: ColorRangeProperty[]
  visible: boolean
  type: string
}

export interface GeoJsonLayer {
  geojson: GeoJsonFeatureCollection
  geojsonList: GeoJsonLayerProperty[]
  style: any
  name: string
  index: number
  color: string
  api: boolean
  info: string
  layerColor: any
  uniqueKeys: string[]
  url: string
}

export type TerrainLevel = 'disabled' | 'medium' | 'high'
