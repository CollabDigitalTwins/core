import { parseGeoJSON, summarizeFeatures } from './geojsonFile'

describe('parseGeoJSON', () => {
  it('normalises a FeatureCollection input', () => {
    const text = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] }, properties: { a: 1 } },
      ],
    })
    const result = parseGeoJSON(text)
    expect(result.featureCollection.type).toBe('FeatureCollection')
    expect(result.featureCollection.features).toHaveLength(1)
    expect(result.summary.featureCount).toBe(1)
  })

  it('wraps a single Feature into a FeatureCollection', () => {
    const text = JSON.stringify({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [3, 4] },
      properties: {},
    })
    const result = parseGeoJSON(text)
    expect(result.featureCollection.features).toHaveLength(1)
    expect(result.featureCollection.features[0].geometry.type).toBe('Point')
  })

  it('wraps a bare Geometry into a Feature', () => {
    const text = JSON.stringify({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] })
    const result = parseGeoJSON(text)
    expect(result.featureCollection.features).toHaveLength(1)
    expect(result.featureCollection.features[0].geometry.type).toBe('Polygon')
    expect(result.featureCollection.features[0].properties).toEqual({})
  })

  it('treats a FeatureCollection with no features array as empty', () => {
    const text = JSON.stringify({ type: 'FeatureCollection' })
    const result = parseGeoJSON(text)
    expect(result.featureCollection.features).toEqual([])
    expect(result.summary.featureCount).toBe(0)
  })

  it('throws on non-object input', () => {
    expect(() => parseGeoJSON(JSON.stringify('hello'))).toThrow('File is not a JSON object')
  })

  it('throws on unknown type', () => {
    expect(() => parseGeoJSON(JSON.stringify({ type: 'Banana' }))).toThrow(/Unrecognised GeoJSON type/)
  })

  it('throws on malformed JSON', () => {
    expect(() => parseGeoJSON('{not json')).toThrow()
  })
})

describe('summarizeFeatures', () => {
  it('counts features and geometry types', () => {
    const features: GeoJSON.Feature[] = [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 1] }, properties: {} },
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 1], [2, 2], [0, 0]]] }, properties: {} },
    ]
    const summary = summarizeFeatures(features)
    expect(summary.featureCount).toBe(3)
    expect(summary.geometryTypes).toEqual({ Point: 2, Polygon: 1 })
  })

  it('returns a sorted union of property keys', () => {
    const features: GeoJSON.Feature[] = [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { zeta: 1, alpha: 2 } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 1] }, properties: { mu: 3, alpha: 4 } },
    ]
    expect(summarizeFeatures(features).propertyKeys).toEqual(['alpha', 'mu', 'zeta'])
  })

  it('computes the bbox across mixed geometry types', () => {
    const features: GeoJSON.Feature[] = [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [-5, -3] }, properties: {} },
      { type: 'Feature', geometry: { type: 'LineString', coordinates: [[10, 20], [-1, 8]] }, properties: {} },
    ]
    expect(summarizeFeatures(features).bbox).toEqual([-5, -3, 10, 20])
  })

  it('returns null bbox when no positional coordinates are found', () => {
    const features: GeoJSON.Feature[] = [
      { type: 'Feature', geometry: { type: 'GeometryCollection', geometries: [] } as any, properties: {} },
    ]
    expect(summarizeFeatures(features).bbox).toBeNull()
  })

  it('exposes the first feature as `sample` and null when empty', () => {
    const f: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { id: 1 },
    }
    expect(summarizeFeatures([f]).sample).toBe(f)
    expect(summarizeFeatures([]).sample).toBeNull()
  })

  it('ignores a z value in 3D coordinates when computing the bbox', () => {
    const pt = { type: 'Feature', geometry: { type: 'Point', coordinates: [10, 20, 999] }, properties: {} } as never
    expect(summarizeFeatures([pt]).bbox).toEqual([10, 20, 10, 20])
  })
})
