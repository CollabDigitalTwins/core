// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { detectSourceType, extractWmsLayers, nameFromUrl, buildWmsTileUrl } from '../urlSources'

describe('detectSourceType', () => {
  it('detects WMS URLs', () => {
    expect(detectSourceType('https://example.com/geoserver/wms?service=WMS')).toBe('wms')
    expect(detectSourceType('https://example.com/ows?SERVICE=WMS&REQUEST=GetMap')).toBe('wms')
  })

  it('detects ArcGIS Feature Service URLs', () => {
    expect(detectSourceType('https://services.arcgis.com/abc/arcgis/rest/services/Roads/FeatureServer/0')).toBe('arcgis')
    expect(detectSourceType('https://example.com/arcgis/rest/services/X/MapServer')).toBe('arcgis')
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

describe('buildWmsTileUrl', () => {
  it('builds a GetMap template with a literal bbox token', () => {
    const tpl = buildWmsTileUrl('https://x.com/geoserver/wms?foo=bar', 'topo:roads')
    expect(tpl).toContain('https://x.com/geoserver/wms?')
    expect(tpl).toContain('REQUEST=GetMap')
    expect(tpl).toContain('LAYERS=topo%3Aroads')
    expect(tpl).toContain('SRS=EPSG%3A3857')
    expect(tpl.endsWith('&BBOX={bbox-epsg-3857}')).toBe(true)
    // the pre-existing query string is dropped, not duplicated
    expect(tpl).not.toContain('foo=bar')
  })
})
