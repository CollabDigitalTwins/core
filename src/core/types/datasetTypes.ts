// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins


import type { Building, DataManagementSystem, DatasetGroup, OpenDataPortal,  } from './dbTypes'
import type { BoundingBox, GeoJsonLayerProperty } from './map'
import type { ColourRampName } from '../components/viewers/map/utils/colourRamps'
import type { AllGeoJSON } from '@turf/turf'
import type { FeatureCollection } from 'geojson'
import type { Layer } from 'react-map-gl/maplibre'
export interface OpenData {
  datasets: OpenDataPortal[]
  countrySubdivisions: CountrySubdivision[]
}

export interface CountrySubdivision {
  name: string
  term: string // ISO 3166-2 subdivision code e.g. "CA-ON"
  code: number
  datasets: OpenDataPortal[]
  municipalities: Municipality[]
  attribution?: string
  license?: string
  bbox?: BoundingBox
}
export interface Municipality {
  name: string // csdname = Census subdivision name.
  id: string // csduid = up to 7 letter digits Census Subdivisions : Uniquely identifies a census subdivision (composed of the 2-digit country subdivision unique identifier followed by the 2-digit census division code and the 3-digit census subdivision code).
  csdtype?: string // Census subdivisions are classified according to designations adopted by provincial/territorial or national authorities.
  datasets: OpenDataPortal[]
}

export interface License {
  attribution?: string
  license?: string
  licenseUrl?: string
}

export type FieldType = 'all' |'string' | 'number' | 'boolean' | 'id' | 'datetime' | 'blob' | 'object' | undefined

export type LayerGeometryType = 'circle' | 'fill' | 'line'

export interface LayerColors {
  color: string
  nameColor:string
  minColor?: string
  maxColor?: string
}

export interface DatasetField {
  name: string
  type: FieldType
  alias?: string
  description?: string
}

/** A field's type and value summary, inferred from loaded features rather than provider metadata. */
export interface FieldProfile extends DatasetField {
  isId: boolean
  nullCount: number
  distinctValues: string[]
  numericSample?: number[]
  min?: number
  max?: number
}

export type ClassificationMethod = 'equalInterval' | 'quantile' | 'jenks'

export interface CategoryColour {
  value: string
  colour: string
  /** 0–1, multiplied into the layer opacity; omitted means opaque. */
  opacity?: number
}

export type DatasetRenderer =
  | { kind: 'single' }
  | { kind: 'featureColour'; property: string }
  | { kind: 'categorical'; field: string; categories: CategoryColour[]; otherColour: string }
  | { kind: 'boolean'; field: string; trueColour: string; falseColour: string; nullColour: string }
  | { kind: 'ramp'; field: string; min: number; max: number; minColour: string; maxColour: string }
  | { kind: 'graduated'; field: string; method: ClassificationMethod; breaks: number[]; colours: string[]; ramp?: ColourRampName }
  | { kind: 'heatmap'; weightField?: string; maxWeight?: number }

export interface DatasetLabel {
  field: string
  size: number
  colour: string
}

export interface DatasetStyle {
  renderer: DatasetRenderer
  opacity: number
  strokeColour: string
  strokeWidth: number
  strokeOpacity: number
  pointRadius: number
  lineWidth: number
  label?: DatasetLabel
}

/** The publisher's own styling, applied when a dataset is first added. */
export interface SourceStyle {
  style: DatasetStyle
  layerColour?: string
}

export type DatasetType = 'GeoJSON' | 'MVT' | 'WMS' | 'WMTS' | 'ArcGISRaster' | 'XYZ'

export type MapServiceKind = 'wms' | 'wmts' | 'arcgisMapServer' | 'arcgisImageServer' | 'xyz'

/** Enough to rebuild a raster map service: its endpoint, kind and, for WMS/WMTS, the chosen layer. */
export interface MapServiceDescriptor {
  kind: MapServiceKind
  url: string
  layer?: string
}

export interface Dataset {
  id?: string
  organization?: number
  name: string
  dataManagementSystem: DataManagementSystem | 'other'
  publisher?: string
  license?: string
  contact?: string
  keywords?: string[]
  subject?: string[]
  description?: string
  information?: string
  dateReleased?: string
  dateUpdated?: string
  lastEditDate?: string
  dataLastEditDate?: string
  datasetType: DatasetType
  countrySubdivision: string
  municipality: string
  type: string
  group: DatasetGroup | `${DatasetGroup}`
  url?: string
  sourceUrl?: string // use to get the source data
  clickable?: boolean // let the front-end know if this layer can be clicked?
  visible?: boolean // let the front-end know if this layer can be visible?
  layersIds?: string[] // The layers that will be used to render the geojson data that is associated with this dataset.
  layerType?: LayerGeometryType // The type of layer that will be used to render the geojson data that is associated with this dataset.
  layerColor: LayerColors
  properties?: any // properties based on the dataset.
  total?: number // total number of records in the dataset
  fields?: FieldProfile[]
  style?: DatasetStyle
  order?: number
  getFeaturesData?: () => Promise<Object>
  getFields: () => Promise<DatasetField[]>
  getFeatures: (options?: FeatureRequest) => Promise<AllGeoJSON>
  getSourceStyle?: () => Promise<SourceStyle | undefined>
  /** Frees what loading kept in memory; called when the layer leaves the map. */
  release?: () => void
  /** Rejects when loading would predictably fail, so the dataset is never added. */
  probe?: () => Promise<void>
  portal?: OpenDataPortal // The portal that this dataset belongs to.
  legend?: ServiceLegend
  files?: []
  // Carries the published identity across tabs, since the portal entry keeps its own id.
  publishedTable?: string // the org_<orgId>_file_<fileId> Martin table name
  publishedFileId?: number // the (synthetic) File row id backing that table
  timeEnabled?: boolean // WMS-T: animate the layer's TIME dimension
  wms?: { baseUrl: string; layers: string; proxied?: boolean } // `url` already bakes LAYERS into a tile template, so time frames rebuild from this
  wmsFrames?: string[]
  viewport?: DatasetViewport
  mapService?: MapServiceDescriptor
  // The slug of the plugin whose own `map.layers` draws this dataset, so core draws nothing.
  drawnByPlugin?: string
}

/** A map service's key: one image, or a labelled image per entry. */
export interface ServiceLegend {
  imageUrl?: string
  items?: Array<{ label: string; imageUrl?: string; colour?: string }>
}

/** How far a feature load has got; `fraction` (0–1) is set only when the end is known. */
export interface LoadProgress {
  fraction?: number
  featureCount?: number
  totalFeatureCount?: number
  bytes?: number
  totalBytes?: number
}

export type ProgressListener = (progress: LoadProgress) => void

/** What the map asks `getFeatures` for: the visible area, and a listener for progress on slow loads. */
export interface FeatureRequest {
  bbox?: [number, number, number, number]
  zoom?: number
  onProgress?: ProgressListener
  /** Aborted when the layer no longer wants this load: a newer view superseded it, or the layer left the map. */
  signal?: AbortSignal
}

/** Receives datasets as a portal fetch discovers them, before the whole catalogue has loaded. */
export type DatasetListener = (datasets: Dataset[]) => void

/** Features plus, when the load was cut short, how many were kept. */
export interface LoadedFeatures extends FeatureCollection {
  truncatedAt?: number
}

/** Marks a dataset too large to load whole: features are fetched per map view, and only at or above `minZoom`. */
export interface DatasetViewport {
  minZoom: number
}
export interface AllDatasets {
  nationalDatasets: OpenDataPortal[]
  provincialDatasets: OpenDataPortal[]
  municipalDatasets: OpenDataPortal[]
  placeDatasets?: OpenDataPortal[]
}

// WMS Types

export interface ContactPersonPrimary {
  ContactPerson: string
  ContactOrganization: string
}

export interface ContactAddress {
  AddressType: string
  Address: string
  City: string
  StateOrProvince: string
  PostCode: string
  Country: string
}

export interface ContactInformation {
  ContactPersonPrimary: ContactPersonPrimary
  ContactPosition: string
  ContactAddress: ContactAddress
  ContactVoiceTelephone: string
  ContactElectronicMailAddress: string
}
export interface Service {
  Name: string
  Title: string
  Abstract: string
  KeywordList: string[]
  OnlineResource: string
  ContactInformation: ContactInformation
  Fees: string
  AccessConstraints: string
  LayerLimit: number
  MaxWidth: number
  MaxHeight: number
}

export interface EX_GeographicBoundingBox {
  eastBoundLongitude: string[]
  northBoundLatitude: string[]
  southBoundLatitude: string[]
  westBoundLongitude: string[]
}

export interface WmsBoundingBox {
  minx: string[]
  miny: string[]
  maxx: string[]
  maxy: string[]
}

export interface LogoURL {
  Format: string
  OnlineResource: string
  size: number[]
}

export interface Attribution {
  Title: string
  OnlineResource: string
  LogoURL: LogoURL
}
export interface Layer {
  Title: string
  Name: string
  Abstract: string
  KeywordList: string[]
  CRS: string[]
  BoundingBox: BoundingBox[]
  EX_GeographicBoundingBox: EX_GeographicBoundingBox[]
}

export interface Capability {
  Request: Request
  Exception: string[]
  Layer: Layer
}

export interface Versions {
  version: string
}

export interface WmsCapabilities {
  $: Versions
  Capability: Capability[]
  Service: Service[]
}

export interface BuildingDataset {
  name: string
  data: Building[]
  total?: number
  visible?: boolean
  fields?: any[]
  layerColor?: LayerColors
}

export interface IWms {
  name: string
  title: string
  abstract: string
  url: string
  wmsCapabilities: WmsCapabilities
  visibility: boolean
  type: string
}

export interface LayerType extends GeoJsonLayerProperty, IWms {}
