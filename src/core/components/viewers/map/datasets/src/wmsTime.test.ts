// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import {
  buildWmsTimeUrl,
  expandTimeRange,
  formatFrameTime,
  parseIso8601DurationMs,
  parseTimeExtent,
  wmsCapabilitiesUrl,
  wmsLegendUrl,
} from './wmsTime'

describe('parseIso8601DurationMs', () => {
  it('parses minute durations', () => {
    expect(parseIso8601DurationMs('PT6M')).toBe(6 * 60 * 1000)
  })
  it('parses combined H/M/S', () => {
    expect(parseIso8601DurationMs('PT1H30M15S')).toBe((3600 + 1800 + 15) * 1000)
  })
  it('parses day component', () => {
    expect(parseIso8601DurationMs('P1DT12H')).toBe((86400 + 43200) * 1000)
  })
  it('returns 0 for an unparseable string', () => {
    expect(parseIso8601DurationMs('6 minutes')).toBe(0)
    expect(parseIso8601DurationMs('')).toBe(0)
  })
})

describe('expandTimeRange', () => {
  it('expands a start/end/PT6M window into evenly spaced frames, oldest first', () => {
    const frames = expandTimeRange('2026-06-03T20:00:00Z', '2026-06-03T20:18:00Z', 'PT6M')
    expect(frames).toEqual([
      '2026-06-03T20:00:00Z',
      '2026-06-03T20:06:00Z',
      '2026-06-03T20:12:00Z',
      '2026-06-03T20:18:00Z',
    ])
  })
  it('strips the millisecond component (WMS TIME wants ...:00Z)', () => {
    const frames = expandTimeRange('2026-06-03T20:00:00Z', '2026-06-03T20:06:00Z', 'PT6M')
    frames.forEach(f => expect(f).toMatch(/:\d{2}Z$/))
  })
  it('appends the end frame when the range is not a whole multiple of the step', () => {
    const frames = expandTimeRange('2026-06-03T20:00:00Z', '2026-06-03T20:10:00Z', 'PT6M')
    expect(frames[0]).toBe('2026-06-03T20:00:00Z')
    expect(frames[frames.length - 1]).toBe('2026-06-03T20:10:00Z')
  })
  it('caps the result to maxFrames, keeping the newest', () => {
    const frames = expandTimeRange('2026-06-03T00:00:00Z', '2026-06-03T10:00:00Z', 'PT6M', 5)
    expect(frames).toHaveLength(5)
    expect(frames[frames.length - 1]).toBe('2026-06-03T10:00:00Z')
  })
  it('falls back to a single frame when the interval is unparseable', () => {
    expect(expandTimeRange('2026-06-03T20:00:00Z', '2026-06-03T23:00:00Z', 'bogus'))
      .toEqual(['2026-06-03T20:00:00Z'])
  })
  it('returns empty when the start is invalid', () => {
    expect(expandTimeRange('not-a-date', '2026-06-03T23:00:00Z', 'PT6M')).toEqual([])
  })
})

describe('parseTimeExtent', () => {
  const caps = (dimBody: string) =>
    `<Layer><Name>RADAR_1KM_RRAI</Name>` +
    `<Dimension name="time" units="ISO8601" default="2026-06-03T23:00:00Z" nearestValue="0">${dimBody}</Dimension>` +
    `</Layer>`

  it('parses the real GeoMet start/end/PT6M extent shape', () => {
    const { frames } = parseTimeExtent(caps('2026-06-03T22:48:00Z/2026-06-03T23:00:00Z/PT6M'))
    expect(frames).toEqual([
      '2026-06-03T22:48:00Z',
      '2026-06-03T22:54:00Z',
      '2026-06-03T23:00:00Z',
    ])
  })
  it('handles a comma-separated timestamp list', () => {
    const { frames } = parseTimeExtent(caps('2026-06-03T22:54:00Z,2026-06-03T23:00:00Z'))
    expect(frames).toEqual(['2026-06-03T22:54:00Z', '2026-06-03T23:00:00Z'])
  })
  it('returns no frames when there is no time dimension', () => {
    expect(parseTimeExtent('<Layer><Name>RADAR_1KM_RRAI</Name></Layer>').frames).toEqual([])
  })
  it('returns no frames for an empty dimension body', () => {
    expect(parseTimeExtent(caps('')).frames).toEqual([])
  })
})

describe('buildWmsTimeUrl / wmsCapabilitiesUrl', () => {
  const BASE = 'https://geo.weather.gc.ca/geomet'
  it('embeds the TIME + LAYERS params and keeps the bbox token literal', () => {
    const url = buildWmsTimeUrl(BASE, 'RADAR_1KM_RRAI', '2026-06-03T23:00:00Z')
    expect(url).toContain('REQUEST=GetMap')
    expect(url).toContain('LAYERS=RADAR_1KM_RRAI')
    expect(url).toContain('SRS=EPSG%3A3857')
    expect(url).toContain('TIME=2026-06-03T23%3A00%3A00Z')
    expect(url).toContain('TRANSPARENT=true')
    expect(url.endsWith('&BBOX={bbox-epsg-3857}')).toBe(true)
  })
  it('strips an existing query string off the base before building', () => {
    const url = buildWmsTimeUrl(`${BASE}?foo=bar`, 'RADAR_1KM_RRAI', '2026-06-03T23:00:00Z')
    expect(url).not.toContain('foo=bar')
  })
  it('builds a layer-scoped GetCapabilities URL', () => {
    expect(wmsCapabilitiesUrl(BASE, 'RADAR_1KM_RRAI'))
      .toBe('https://geo.weather.gc.ca/geomet?service=WMS&version=1.3.0&request=GetCapabilities&layer=RADAR_1KM_RRAI')
  })
  it('builds a GetLegendGraphic URL for the default style', () => {
    const url = wmsLegendUrl(BASE, 'RADAR_1KM_RRAI')
    expect(url).toContain('REQUEST=GetLegendGraphic')
    expect(url).toContain('LAYER=RADAR_1KM_RRAI')
    expect(url).toContain('FORMAT=image%2Fpng')
    expect(url).not.toContain('STYLE=')
  })
})

describe('formatFrameTime', () => {
  it('returns the raw string for an unparseable timestamp', () => {
    expect(formatFrameTime('not-a-date')).toBe('not-a-date')
  })
  it('formats a valid timestamp to a short time label', () => {
    const label = formatFrameTime('2026-06-03T23:00:00Z')
    expect(typeof label).toBe('string')
    expect(label.length).toBeGreaterThan(0)
  })
})
