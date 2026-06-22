// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { BoundingBox, GeoJsonLayerProperty } from './map'
import { Layer } from 'react-map-gl/maplibre'
import type { AllGeoJSON } from '@turf/turf'
import type { Building, DataManagementSystem, DatasetGroup, OpenDataPortal,  } from './dbTypes'
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

export type ColorType = 'single' | 'minMax' | 'boolean'

export interface DatasetField {
  name: string
  datasetName: string;
  type: FieldType
  colorType?: ColorType
  layerColor?: LayerColors
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
  datasetType: 'GeoJSON' | 'MVT' | 'WMS'
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
  fields?: DatasetField[]
  selectedFieldName?: string // the name of the selected field to visualize on the map
  order?: number
  getFeaturesData?: () => Promise<Object>
  getFields: () => Promise<any[]>
  getFeatures: (options?: { bbox?: [number, number, number, number]; zoom?: number }) => Promise<AllGeoJSON>
  portal?: OpenDataPortal // The portal that this dataset belongs to.
  files?: []
  // Set when this logical dataset has already been published to Martin vector
  // tiles (via the open-data "Publish as vector tiles" path). The original
  // portal entry keeps its own id across the national/applied/all tabs, so these
  // flags carry the published identity so RowActions can show it as converted
  // (and drive un-publish) on every tab — not just the organizational one.
  publishedTable?: string // the org_<orgId>_file_<fileId> Martin table name
  publishedFileId?: number // the (synthetic) File row id backing that table
  // ── WMS time animation ──
  // Set on time-enabled WMS live datasets (e.g. the GeoMet radar). When true,
  // WMSDatasetLayer fetches the layer's GetCapabilities time extent and shows a
  // scrub/play control that animates the WMS TIME dimension.
  timeEnabled?: boolean
  // The raw WMS coordinates the time control needs to rebuild GetMap/GetCapabilities
  // URLs (the composed `url` already baked LAYERS into a tile template).
  wms?: { baseUrl: string; layers: string }
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
