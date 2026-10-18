// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** Cap on expanded frames — guards against a pathological extent string. */
const MAX_FRAMES = 60

/** Strip the millisecond component toISOString adds; WMS TIME wants `...:00Z`. */
function toWmsTime(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/** Parse an ISO8601 duration (`PT6M`, `PT1H30M`, `P1DT12H`) into ms. 0 if unparseable. */
export function parseIso8601DurationMs(iso: string): number {
  const m = iso.trim().match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i)
  if (!m) return 0
  const [, d, h, min, s] = m
  const seconds =
    Number(d || 0) * 86400 + Number(h || 0) * 3600 + Number(min || 0) * 60 + Number(s || 0)
  return seconds * 1000
}

/** Ascending frame timestamps for a `start/end/interval` extent, keeping the newest `maxFrames`; `[start]` when the interval does not parse. */
export function expandTimeRange(
  startIso: string,
  endIso: string,
  intervalIso: string,
  maxFrames: number = MAX_FRAMES,
): string[] {
  const start = Date.parse(startIso)
  const end = Date.parse(endIso)
  const stepMs = parseIso8601DurationMs(intervalIso)

  if (!Number.isFinite(start)) return []
  if (!Number.isFinite(end) || stepMs <= 0 || end < start) return [toWmsTime(start)]

  const out: string[] = []
  for (let t = start; t <= end; t += stepMs) {
    out.push(toWmsTime(t))
  }
  const endStr = toWmsTime(end)
  if (out[out.length - 1] !== endStr) out.push(endStr)

  return out.length > maxFrames ? out.slice(out.length - maxFrames) : out
}

/** Frame timestamps from a `<Dimension name="time">`'s text, written as a `start/end/interval` range or a comma list. */
export function parseTimeExtent(extent: string, maxFrames: number = MAX_FRAMES): string[] {
  const body = extent.trim()
  if (!body) return []
  if (body.includes('/')) {
    const [start, end, interval] = body.split('/')
    return expandTimeRange(start, end, interval, maxFrames)
  }
  if (body.includes(',')) {
    const frames = body.split(',').map(s => s.trim()).filter(Boolean)
    return frames.length > maxFrames ? frames.slice(frames.length - maxFrames) : frames
  }
  return [body]
}

/** Pull a `LAYERS`/`layers` value out of a WMS URL, if present. */
export function extractWmsLayers(url: string): string {
  try {
    const params = new URL(url).searchParams
    for (const [key, value] of params) {
      if (key.toLowerCase() === 'layers' && value) return value
    }
  }
  catch { /* not a parseable URL yet */ }
  return ''
}

/** Short local-time label for a frame timestamp (e.g. "3:42 PM"). */
export function formatFrameTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** Layer-scoped GetCapabilities URL — returns a small XML payload with the live time extent. */
export function wmsCapabilitiesUrl(baseUrl: string, layers: string): string {
  const base = baseUrl.split('?')[0]
  return `${base}?service=WMS&version=1.3.0&request=GetCapabilities&layer=${encodeURIComponent(layers)}`
}

/** The server-rendered legend image for the layer's default style, matching the `STYLES=''` tiles. */
export function wmsLegendUrl(baseUrl: string, layers: string): string {
  const base = baseUrl.split('?')[0]
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetLegendGraphic',
    LAYER: layers,
    FORMAT: 'image/png',
    SLD_VERSION: '1.1.0',
  })
  return `${base}?${params.toString()}`
}

/** A MapLibre raster tile template for WMS GetMap, optionally at one `time`; `{bbox-epsg-3857}` stays literal for MapLibre. */
export function buildWmsTileUrl(baseUrl: string, layers: string, time?: string): string {
  const base = baseUrl.split('?')[0]
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
    LAYERS: layers,
    STYLES: '',
    SRS: 'EPSG:3857',
    WIDTH: '256',
    HEIGHT: '256',
  })
  if (time) params.set('TIME', time)
  return `${base}?${params.toString()}&BBOX={bbox-epsg-3857}`
}
