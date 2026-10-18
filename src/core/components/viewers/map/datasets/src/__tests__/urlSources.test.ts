// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { detectSourceType, extractWmsLayers, nameFromUrl } from '../urlSources'

describe('detectSourceType', () => {
  it('detects WMS URLs', () => {
    expect(detectSourceType('https://example.com/geoserver/wms?service=WMS')).toBe('wms')
    expect(detectSourceType('https://example.com/ows?SERVICE=WMS&REQUEST=GetMap')).toBe('wms')
  })

  it('detects ArcGIS feature layers, including a MapServer layer', () => {
    expect(detectSourceType('https://services.arcgis.com/abc/arcgis/rest/services/Roads/FeatureServer/0')).toBe('arcgis')
    expect(detectSourceType('https://services.arcgis.com/abc/arcgis/rest/services/Roads/FeatureServer')).toBe('arcgis')
    expect(detectSourceType('https://example.com/arcgis/rest/services/X/MapServer/3')).toBe('arcgis')
  })

  it('treats a whole MapServer, ImageServer, WMTS or XYZ template as a raster service', () => {
    expect(detectSourceType('https://example.com/arcgis/rest/services/X/MapServer')).toBe('arcgisMapServer')
    expect(detectSourceType('https://example.com/arcgis/rest/services/Elev/ImageServer')).toBe('arcgisImageServer')
    expect(detectSourceType('https://example.com/wmts/1.0.0/WMTSCapabilities.xml')).toBe('wmts')
    expect(detectSourceType('https://tile.example.com/{z}/{x}/{y}.png')).toBe('xyz')
  })

  it('falls back to geojson', () => {
    expect(detectSourceType('https://example.com/data/roads.geojson')).toBe('geojson')
  })
})

describe('extractWmsLayers', () => {
  it('pulls the LAYERS param case-insensitively', () => {
    expect(extractWmsLayers('https://x.com/wms?SERVICE=WMS&LAYERS=topo:roads')).toBe('topo:roads')
    expect(extractWmsLayers('https://x.com/wms?layers=basemap')).toBe('basemap')
  })

  it('returns empty string when absent', () => {
    expect(extractWmsLayers('https://x.com/wms?service=WMS')).toBe('')
  })
})

describe('nameFromUrl', () => {
  it('skips ArcGIS plumbing segments', () => {
    expect(nameFromUrl('https://services.arcgis.com/a/arcgis/rest/services/Belleville_Data/FeatureServer/0'))
      .toBe('Belleville_Data')
  })

  it('uses the last path segment for a file URL', () => {
    expect(nameFromUrl('https://example.com/data/roads.geojson')).toBe('roads.geojson')
  })
})
