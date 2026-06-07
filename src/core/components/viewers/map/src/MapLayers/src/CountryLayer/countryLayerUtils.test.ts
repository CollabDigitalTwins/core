import { describe, it, expect } from 'vitest'
import { hexToRgba, buildSubdivisionUrl, ARCGIS_BASE } from './countryLayerUtils'

describe('hexToRgba', () => {
  it('converts a 6-digit hex (with or without #)', () => {
    expect(hexToRgba('#73cee2', 0.7)).toBe('rgba(115, 206, 226, 0.7)')
    expect(hexToRgba('73cee2', 1)).toBe('rgba(115, 206, 226, 1)')
  })

  it('expands 3-digit shorthand (the #abc → NaN bug)', () => {
    // '#abc' → 'aabbcc'
    expect(hexToRgba('#abc', 0.5)).toBe('rgba(170, 187, 204, 0.5)')
    expect(hexToRgba('#000', 1)).toBe('rgba(0, 0, 0, 1)')
  })

  it('falls back to black on malformed input (never emits NaN)', () => {
    expect(hexToRgba('not-a-hex', 0.7)).toBe('rgba(0, 0, 0, 0.7)')
    expect(hexToRgba('', 0.3)).toBe('rgba(0, 0, 0, 0.3)')
    expect(hexToRgba('#12', 1)).toBe('rgba(0, 0, 0, 1)')
  })
})

describe('buildSubdivisionUrl', () => {
  it('builds the ArcGIS query URL with the country code (url-encoded)', () => {
    const url = buildSubdivisionUrl('CA')
    expect(url.startsWith(`${ARCGIS_BASE}?`)).toBe(true)
    const qs = new URLSearchParams(url.split('?')[1])
    expect(qs.get('where')).toBe("ISO_CC='CA'")
    expect(qs.get('f')).toBe('geojson')
    expect(qs.get('outFields')).toBe('NAME,ISO_CC,ISO_CODE,ADMINTYPE')
  })

  it('accepts a custom base URL', () => {
    expect(buildSubdivisionUrl('US', 'https://x/q').startsWith('https://x/q?')).toBe(true)
  })
})
