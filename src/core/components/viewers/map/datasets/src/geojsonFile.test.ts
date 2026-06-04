import { describe, it, expect } from 'vitest'
import { parseGeoJSON, summarizeFeatures } from './geojsonFile'

describe('geojsonFile: parseGeoJSON', () => {
  it('normalises a bare geometry into a FeatureCollection', () => {
    const { featureCollection, summary } = parseGeoJSON(JSON.stringify({ type: 'Point', coordinates: [1, 2] }))
    expect(featureCollection.type).toBe('FeatureCollection')
    expect(featureCollection.features).toHaveLength(1)
    expect(summary.geometryTypes).toEqual({ Point: 1 })
    expect(summary.bbox).toEqual([1, 2, 1, 2])
  })

  it('unwraps a single Feature', () => {
    const { featureCollection } = parseGeoJSON(JSON.stringify({
      type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { a: 1 },
    }))
    expect(featureCollection.features).toHaveLength(1)
  })

  it('keeps FeatureCollection features and summarises them (sorted property union)', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { name: 'a' } },
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [[1, 1], [3, 4]] }, properties: { id: 9 } },
      ],
    }
    const { summary } = parseGeoJSON(JSON.stringify(fc))
    expect(summary.featureCount).toBe(2)
    expect(summary.geometryTypes).toEqual({ Point: 1, LineString: 1 })
    expect(summary.propertyKeys).toEqual(['id', 'name'])
    expect(summary.bbox).toEqual([0, 0, 3, 4])
  })

  it('throws on invalid JSON', () => {
    expect(() => parseGeoJSON('{not json')).toThrow()
  })

  it('throws on an unrecognised GeoJSON type', () => {
    expect(() => parseGeoJSON(JSON.stringify({ type: 'Banana' }))).toThrow(/Unrecognised GeoJSON type/)
  })
})

describe('geojsonFile: summarizeFeatures', () => {
  it('returns a null bbox + null sample when given no features', () => {
    const s = summarizeFeatures([])
    expect(s.featureCount).toBe(0)
    expect(s.bbox).toBeNull()
    expect(s.sample).toBeNull()
  })

  it('walks nested coordinates (Polygon ring) to compute the bbox', () => {
    const polygon = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[-1, -2], [5, 6], [2, 9], [-1, -2]]] },
      properties: {},
    } as never
    expect(summarizeFeatures([polygon]).bbox).toEqual([-1, -2, 5, 9])
  })

  it('ignores a z value in 3D coordinates when computing the bbox', () => {
    const pt = { type: 'Feature', geometry: { type: 'Point', coordinates: [10, 20, 999] }, properties: {} } as never
    expect(summarizeFeatures([pt]).bbox).toEqual([10, 20, 10, 20])
  })
})
