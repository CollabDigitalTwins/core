// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, it, expect } from 'vitest'

import { BUILT_IN_MAP_STYLES } from './mapStyleCatalog'
import {
  MAPTILER_PLACEHOLDER_KEY,
  buildSatelliteStyle,
  maptilerKeyOrPlaceholder,
  resolveStyleSpec,
} from './mapStyleSpec'

describe('maptilerKeyOrPlaceholder', () => {
  it('returns a real key trimmed', () => {
    expect(maptilerKeyOrPlaceholder('  REALKEY  ')).toBe('REALKEY')
  })

  it('falls back to the placeholder for undefined, empty and blank keys', () => {
    expect(maptilerKeyOrPlaceholder(undefined)).toBe(MAPTILER_PLACEHOLDER_KEY)
    expect(maptilerKeyOrPlaceholder('')).toBe(MAPTILER_PLACEHOLDER_KEY)
    expect(maptilerKeyOrPlaceholder('   ')).toBe(MAPTILER_PLACEHOLDER_KEY)
  })
})

describe('buildSatelliteStyle with a key', () => {
  const spec = buildSatelliteStyle('REALKEY')
  const serialized = JSON.stringify(spec)

  it('serves imagery and elevation from MapTiler on that key', () => {
    expect(serialized).not.toContain(MAPTILER_PLACEHOLDER_KEY)
    expect((spec.sources['raster-tiles'] as any).tiles[0]).toContain('satellite-v2')
    expect((spec.sources['raster-tiles'] as any).tiles[0]).toContain('key=REALKEY')
    expect((spec.sources.terrainSource as any).url).toContain('terrain-rgb-v2')
    expect((spec.sources.hillshadeSource as any).url).toContain('key=REALKEY')
    expect(spec.glyphs).toContain('key=REALKEY')
  })

  it('keeps the terrain, hillshade and sky configuration of the old static style', () => {
    expect(spec.terrain).toEqual({ source: 'terrainSource', exaggeration: 0.6 })
    expect(spec.layers.map((l) => l.id)).toEqual(['background', 'simple-tiles', 'hillshade'])
    expect(spec.sky).toBeDefined()
    expect(spec.light).toBeDefined()
  })

  it('no longer ships a buildings vector source — BuildingLayer owns that', () => {
    expect(spec.sources.openmaptiles).toBeUndefined()
  })
})

describe('buildSatelliteStyle without a key', () => {
  const spec = buildSatelliteStyle()
  const serialized = JSON.stringify(spec)

  it('bills nothing to MapTiler', () => {
    expect(serialized).not.toContain('api.maptiler.com')
  })

  it('falls back to Esri imagery, terrarium elevation and the OpenMapTiles font CDN', () => {
    expect((spec.sources['raster-tiles'] as any).tiles[0]).toContain('server.arcgisonline.com')
    expect((spec.sources['raster-tiles'] as any).attribution).toContain('Esri')
    expect((spec.sources.terrainSource as any).tiles[0]).toContain('elevation-tiles-prod')
    expect((spec.sources.terrainSource as any).encoding).toBe('terrarium')
    expect((spec.sources.hillshadeSource as any).encoding).toBe('terrarium')
    expect(spec.glyphs).toContain('fonts.openmaptiles.org')
  })

  it('still renders terrain and hillshade', () => {
    expect(spec.terrain).toEqual({ source: 'terrainSource', exaggeration: 0.6 })
    expect(spec.layers.map((l) => l.id)).toContain('hillshade')
  })
})

describe('resolveStyleSpec', () => {
  it('builds the satellite spec from the sentinel', () => {
    const resolved = resolveStyleSpec({ name: 'Satellite', url: 'cdt:satellite' }, 'REALKEY')
    expect(typeof resolved).toBe('object')
    expect(JSON.stringify(resolved)).toContain('satellite-v2')
  })

  it('points the streets sentinel at MapTiler’s hosted style', () => {
    expect(resolveStyleSpec({ name: 'Streets', url: 'cdt:streets' }, 'REALKEY'))
      .toBe('https://api.maptiler.com/maps/streets-v2/style.json?key=REALKEY')
  })

  it('uses the placeholder for the streets sentinel when no key is configured', () => {
    expect(resolveStyleSpec({ name: 'Streets', url: 'cdt:streets' }))
      .toBe(`https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_PLACEHOLDER_KEY}`)
  })

  it('passes organization-supplied style URLs through untouched', () => {
    const url = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
    expect(resolveStyleSpec({ name: 'Dark', url }, 'REALKEY')).toBe(url)
  })

  it('redirects the deleted static styles to their sentinels', () => {
    expect(JSON.stringify(resolveStyleSpec({ name: 'Satellite', url: '/mapStyles/satellite.json' })))
      .toContain('server.arcgisonline.com')
    expect(resolveStyleSpec({ name: 'Streets', url: 'mapStyles/streets.json' }, 'REALKEY'))
      .toBe('https://api.maptiler.com/maps/streets-v2/style.json?key=REALKEY')
  })
})

describe('credential regression guard', () => {
  const keysIn = (specs: unknown): string[] =>
    [...JSON.stringify(specs).matchAll(/key=([^&"]+)/g)].map((m) => m[1])

  it('emits no key other than the configured one', () => {
    const specs = BUILT_IN_MAP_STYLES.map((style) => resolveStyleSpec(style, 'REALKEY'))
    expect(new Set(keysIn(specs))).toEqual(new Set(['REALKEY']))
  })

  it('emits no key other than the placeholder when none is configured', () => {
    const specs = BUILT_IN_MAP_STYLES.map((style) => resolveStyleSpec(style))
    expect(new Set(keysIn(specs))).toEqual(new Set([MAPTILER_PLACEHOLDER_KEY]))
  })
})
