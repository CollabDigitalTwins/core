// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { detectMapService, fetchWmsFrames, isRasterDataset, mapServiceDataset, parseWmsLayers, parseWmtsLayers, resolveMapService, resolveMapServiceOnce } from './mapServices'

const xml = (text: string) => new DOMParser().parseFromString(text, 'text/xml')

const WMS = `<WMS_Capabilities><Capability><Layer><Title>Root</Title>
  <Layer><Name>roads</Name><Title>Roads</Title></Layer>
  <Layer><Name>parks</Name></Layer>
</Layer></Capability></WMS_Capabilities>`

const WMTS = `<Capabilities xmlns="http://www.opengis.net/wmts/1.0" xmlns:ows="http://www.opengis.net/ows/1.1"><Contents>
  <Layer><ows:Title>Ortho</ows:Title><ows:Identifier>ortho</ows:Identifier>
    <Style><ows:Identifier>default</ows:Identifier></Style>
    <TileMatrixSetLink><TileMatrixSet>WebMercator</TileMatrixSet></TileMatrixSetLink>
    <ResourceURL resourceType="tile" template="https://t/ortho/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png"/>
  </Layer>
  <Layer><ows:Identifier>lambert</ows:Identifier>
    <TileMatrixSetLink><TileMatrixSet>LCC</TileMatrixSet></TileMatrixSetLink>
  </Layer>
  <TileMatrixSet><ows:Identifier>WebMercator</ows:Identifier><ows:SupportedCRS>urn:ogc:def:crs:EPSG::3857</ows:SupportedCRS>
    <TileMatrix><ows:Identifier>0</ows:Identifier></TileMatrix></TileMatrixSet>
  <TileMatrixSet><ows:Identifier>LCC</ows:Identifier><ows:SupportedCRS>urn:ogc:def:crs:EPSG::3978</ows:SupportedCRS>
    <TileMatrix><ows:Identifier>0</ows:Identifier></TileMatrix></TileMatrixSet>
</Contents></Capabilities>`

afterEach(() => vi.unstubAllGlobals())

describe('detectMapService', () => {
  it('tells the raster service kinds apart', () => {
    expect(detectMapService('https://geo.weather.gc.ca/geomet?SERVICE=WMS')).toBe('wms')
    expect(detectMapService('https://x/wmts?SERVICE=WMTS&REQUEST=GetCapabilities')).toBe('wmts')
    expect(detectMapService('https://x/arcgis/rest/services/Base/MapServer')).toBe('arcgisMapServer')
    expect(detectMapService('https://x/arcgis/rest/services/DEM/ImageServer')).toBe('arcgisImageServer')
    expect(detectMapService('https://x/{z}/{x}/{y}.png')).toBe('xyz')
    expect(detectMapService('https://x/arcgis/rest/services/Base/MapServer/2')).toBeNull()
  })
})

describe('capabilities parsing', () => {
  it('lists named WMS layers, titling untitled ones by name', () => {
    expect(parseWmsLayers(xml(WMS))).toEqual([{ name: 'roads', title: 'Roads' }, { name: 'parks', title: 'parks' }])
  })

  it('keeps only Web Mercator WMTS layers and turns their template into XYZ', () => {
    expect(parseWmtsLayers(xml(WMTS), 'https://t/WMTSCapabilities.xml')).toEqual([
      { name: 'ortho', title: 'Ortho', tileUrl: 'https://t/ortho/default/WebMercator/{z}/{y}/{x}.png' },
    ])
  })
})

describe('resolveMapService', () => {
  it('uses cached ArcGIS tiles when the service is tiled in Web Mercator', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ singleFusedMapCache: true, tileInfo: { rows: 256, spatialReference: { wkid: 102100 } } }))))
    expect(await resolveMapService({ kind: 'arcgisMapServer', url: 'https://x/MapServer' })).toMatchObject({ tileUrl: 'https://x/MapServer/tile/{z}/{y}/{x}', tileSize: 256 })
  })

  it('exports images from a dynamic ArcGIS service', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')))
    const { tileUrl } = await resolveMapService({ kind: 'arcgisMapServer', url: 'https://x/MapServer' })
    expect(tileUrl).toMatch(/^https:\/\/x\/MapServer\/export\?bbox=\{bbox-epsg-3857\}/)
  })
})

const STATIC_WMS = `<WMS_Capabilities xmlns="http://www.opengis.net/wms" xmlns:xlink="http://www.w3.org/1999/xlink"><Capability>
  <Request><GetMap><DCPType><HTTP><Get><OnlineResource xlink:href="https://maps.example.org/ows/landcover?"/></Get></HTTP></DCPType></GetMap></Request>
  <Layer><Title>Root</Title>
    <Layer><Name>landcover-2010</Name><Title>Land cover 2010</Title>
      <Style><Name>default</Name><LegendURL><OnlineResource xlink:href="https://maps.example.org/legend/landcover.png"/></LegendURL></Style>
    </Layer>
  </Layer>
</Capability></WMS_Capabilities>`

const png = () => new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } })

function wmsServer(capabilities: string, getMap: (url: string) => Promise<Response> | Response = png, other: (url: string) => Response | undefined = () => undefined) {
  return vi.fn(async (url: string) => {
    if (/REQUEST=GetMap/i.test(decodeURIComponent(url))) return getMap(url)
    return other(decodeURIComponent(url)) ?? new Response(capabilities)
  })
}

describe('WMS services', () => {
  it('draws from the GetMap endpoint the capabilities name, not the capabilities file', async () => {
    vi.stubGlobal('fetch', wmsServer(STATIC_WMS))
    const source = await resolveMapService({ kind: 'wms', url: 'https://maps.example.org/web/landcover.xml?request=GetCapabilities&layers=landcover-2010' })
    expect(source.tileUrl.startsWith('https://maps.example.org/ows/landcover?')).toBe(true)
    expect(source.wms?.baseUrl).toBe('https://maps.example.org/ows/landcover')
  })

  it("uses the layer's own legend image", async () => {
    vi.stubGlobal('fetch', wmsServer(STATIC_WMS))
    const source = await resolveMapService({ kind: 'wms', url: 'https://maps.example.org/web/landcover.xml', layer: 'landcover-2010' })
    expect(source.legend).toEqual({ imageUrl: 'https://maps.example.org/legend/landcover.png' })
  })

  it('asks GetLegendGraphic for one layer when none is advertised', async () => {
    vi.stubGlobal('fetch', wmsServer(WMS))
    const source = await resolveMapService({ kind: 'wms', url: 'https://x/wms', layer: 'roads,parks' })
    expect(new URL(source.legend?.imageUrl ?? '').searchParams.get('LAYER')).toBe('roads')
  })
})

const TIME_WMS = `<WMS_Capabilities xmlns="http://www.opengis.net/wms"><Capability>
  <Layer><Title>Root</Title><Dimension name="time" units="ISO8601">2026-06-03T22:48:00Z/2026-06-03T23:00:00Z/PT6M</Dimension>
    <Layer><Name>RADAR_1KM_RRAI</Name><Title>Radar</Title></Layer>
  </Layer>
</Capability></WMS_Capabilities>`

const GEOSERVER_LEGEND = JSON.stringify({ Legend: [{ layerName: 'landcover-2010', rules: [
  { name: 'forest', title: 'Forest', symbolizers: [{ Polygon: { fill: '#2E7D32' } }] },
  { name: 'water', symbolizers: [{ Raster: { colormap: { entries: [{ color: '#1565C0', label: 'Open water' }] } } }] },
] }] })

describe('WMS legends', () => {
  it('reads a GeoServer legend as labelled colours, so its text is ours to size', async () => {
    vi.stubGlobal('fetch', wmsServer(STATIC_WMS, png, url => (/application\/json/i.test(url) ? new Response(GEOSERVER_LEGEND, { headers: { 'content-type': 'application/json' } }) : undefined)))
    const { legend } = await resolveMapService({ kind: 'wms', url: 'https://maps.example.org/web/landcover.xml', layer: 'landcover-2010' })
    expect(legend).toEqual({ items: [{ label: 'Forest', colour: '#2E7D32' }, { label: 'Open water', colour: '#1565C0' }] })
  })

  it('reads the REST legend of a WMS that ArcGIS serves', async () => {
    const rest = JSON.stringify({ layers: [{ layerId: 0, layerName: 'Fires', legend: [{ label: 'Burned in 2023', contentType: 'image/png', imageData: 'AAA' }] }] })
    vi.stubGlobal('fetch', wmsServer(WMS, png, url => (url.includes('/rest/services/') ? new Response(rest) : undefined)))
    const { legend } = await resolveMapService({ kind: 'wms', url: 'https://x/arcgis/services/Fire/MapServer/WMSServer', layer: 'roads' })
    expect(legend).toEqual({ items: [{ label: 'Burned in 2023', imageUrl: 'data:image/png;base64,AAA' }] })
  })
})

describe('WMS tile access', () => {
  it('draws through the proxy when the server blocks cross-origin reads', async () => {
    vi.stubGlobal('fetch', wmsServer(STATIC_WMS, url => (url.startsWith('/api/') ? png() : Promise.reject(new TypeError('Failed to fetch')))))
    const { tileUrl } = await resolveMapService({ kind: 'wms', url: 'https://maps.example.org/web/landcover.xml', layer: 'landcover-2010' })
    expect(tileUrl.startsWith('/api/')).toBe(true)
    expect(tileUrl.endsWith('{bbox-epsg-3857}')).toBe(true)
  })

  it('refuses a service that forbids map requests', async () => {
    vi.stubGlobal('fetch', wmsServer(STATIC_WMS, () => new Response('', { status: 403 })))
    await expect(resolveMapService({ kind: 'wms', url: 'https://maps.example.org/web/landcover.xml', layer: 'landcover-2010' })).rejects.toThrow(/403/)
  })

  it('refuses a service that answers map requests with an error document', async () => {
    vi.stubGlobal('fetch', wmsServer(STATIC_WMS, () => new Response('<ServiceExceptionReport/>', { headers: { 'content-type': 'text/xml' } })))
    await expect(resolveMapService({ kind: 'wms', url: 'https://maps.example.org/web/landcover.xml', layer: 'landcover-2010' })).rejects.toThrow()
  })
})

describe('WMS time dimensions', () => {
  it("reads the frames from the layer's inherited time dimension", async () => {
    vi.stubGlobal('fetch', wmsServer(TIME_WMS))
    const source = await resolveMapService({ kind: 'wms', url: 'https://geo.weather.gc.ca/geomet', layer: 'RADAR_1KM_RRAI' })
    expect(source.timeEnabled).toBe(true)
    expect(source.frames).toEqual(['2026-06-03T22:48:00Z', '2026-06-03T22:54:00Z', '2026-06-03T23:00:00Z'])
  })

  it('loads frames for a WMS that was never resolved, and none when the service fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(TIME_WMS)))
    expect(await fetchWmsFrames({ baseUrl: 'https://geo.weather.gc.ca/geomet', layers: 'RADAR_1KM_RRAI' })).toHaveLength(3)

    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })))
    expect(await fetchWmsFrames({ baseUrl: 'https://geo.weather.gc.ca/geomet', layers: 'RADAR_1KM_RRAI' })).toEqual([])
  })
})

describe('ArcGIS map service legends', () => {
  it('lists each legend entry with its inline image', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('/legend')
      ? { layers: [{ layerName: 'Zoning', legend: [{ label: 'Residential', contentType: 'image/png', imageData: 'AAA' }] }] }
      : {}))))
    const source = await resolveMapService({ kind: 'arcgisMapServer', url: 'https://x/MapServer' })
    expect(source.legend).toEqual({ items: [{ label: 'Residential', imageUrl: 'data:image/png;base64,AAA' }] })
  })
})

describe('map service datasets', () => {
  it('builds a raster dataset that is never clickable', () => {
    const dataset = mapServiceDataset({ kind: 'wms', url: 'https://x/wms', layer: 'roads' }, { name: 'Roads', group: 'National' as never })
    expect(dataset).toMatchObject({ datasetType: 'WMS', clickable: false, mapService: { layer: 'roads' } })
    expect(isRasterDataset(dataset)).toBe(true)
    expect(isRasterDataset({ datasetType: 'GeoJSON', type: 'Parks' })).toBe(false)
  })
})

describe('checking a map service before it is added', () => {
  const service = (url: string) => ({ kind: 'wms' as const, url, layer: 'landcover-2010' })
  const getMaps = (fetch: ReturnType<typeof wmsServer>) => fetch.mock.calls.filter(([url]) => /REQUEST=GetMap/i.test(decodeURIComponent(url))).length

  it('rejects a service that forbids map requests', async () => {
    vi.stubGlobal('fetch', wmsServer(STATIC_WMS, () => new Response('', { status: 403 })))
    const dataset = mapServiceDataset(service('https://probe.example.org/forbidden'), { name: 'Land cover', group: 'National' as never })
    await expect(dataset.probe?.()).rejects.toThrow(/403/)
  })

  it('samples a tile once for the check and the layer that draws it', async () => {
    const fetch = wmsServer(STATIC_WMS)
    vi.stubGlobal('fetch', fetch)
    const dataset = mapServiceDataset(service('https://probe.example.org/shared'), { name: 'Land cover', group: 'National' as never })
    await dataset.probe?.()
    await resolveMapServiceOnce(service('https://probe.example.org/shared'))
    expect(getMaps(fetch)).toBe(1)
  })

  it('tries again after a failure instead of remembering it', async () => {
    vi.stubGlobal('fetch', wmsServer(STATIC_WMS, () => new Response('', { status: 503 })))
    await expect(resolveMapServiceOnce(service('https://probe.example.org/flaky'))).rejects.toThrow()
    vi.stubGlobal('fetch', wmsServer(STATIC_WMS))
    await expect(resolveMapServiceOnce(service('https://probe.example.org/flaky'))).resolves.toMatchObject({ tileSize: 256 })
  })
})
