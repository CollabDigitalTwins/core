/**
 * Generic WMS-T (time dimension) helpers for animating WMS raster overlays.
 *
 * Generalized from the radar-specific helpers (RadarLayer/geomet.ts): any WMS
 * layer with an ISO8601 TIME dimension can be expanded into frames and animated
 * by swapping the GetMap TIME param. Data stays federated — the browser fetches
 * raster tiles directly; nothing is ingested or stored here.
 */

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

/**
 * Expand a WMS-T `start/end/interval` extent into ascending frame timestamps
 * (oldest → newest). Falls back to `[start]` if the interval can't be parsed,
 * `[]` if start itself is invalid. Capped at `maxFrames` (keeps the newest).
 */
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

export interface WmsTimeExtent {
  /** Ascending frame timestamps (oldest → newest). Empty when no time dimension found. */
  frames: string[]
}

/**
 * Pull the `<Dimension name="time">` out of a (layer-scoped) WMS GetCapabilities
 * document and expand it to frame timestamps. Handles the `start/end/interval`
 * form and a bare comma-separated list as a fallback.
 */
export function parseTimeExtent(xml: string, maxFrames: number = MAX_FRAMES): WmsTimeExtent {
  const dim = xml.match(/<Dimension\b[^>]*\bname="time"[^>]*>([\s\S]*?)<\/Dimension>/i)
  if (!dim) return { frames: [] }

  const body = dim[1].trim()
  if (!body) return { frames: [] }

  let frames: string[]
  if (body.includes('/')) {
    const [start, end, interval] = body.split('/')
    frames = expandTimeRange(start, end, interval, maxFrames)
  } else if (body.includes(',')) {
    frames = body.split(',').map(s => s.trim()).filter(Boolean)
    if (frames.length > maxFrames) frames = frames.slice(frames.length - maxFrames)
  } else {
    frames = [body]
  }

  return { frames }
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

/**
 * Build a WMS GetLegendGraphic URL — the server-rendered legend image (colour
 * ramp + labels) for the layer's default style. No STYLE param, so it matches
 * the default-style tiles `buildWmsTimeUrl` requests (STYLES='').
 */
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

/**
 * Build a MapLibre raster tile-URL template for a WMS GetMap request at a given
 * TIME. `{bbox-epsg-3857}` must stay literal — MapLibre substitutes it per tile.
 * Mirrors `buildWmsTileUrl` (WMS 1.1.1 + SRS=EPSG:3857) with TIME added.
 */
export function buildWmsTimeUrl(baseUrl: string, layers: string, time: string): string {
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
    TIME: time,
  })
  return `${base}?${params.toString()}&BBOX={bbox-epsg-3857}`
}

/**
 * Fetch a layer-scoped GetCapabilities document and return its time frames.
 * Thin network wrapper — returns `[]` on any failure so callers can simply
 * render no control (the static latest-frame raster keeps working).
 */
export async function fetchWmsFrames(baseUrl: string, layers: string): Promise<string[]> {
  try {
    const res = await fetch(wmsCapabilitiesUrl(baseUrl, layers))
    if (!res.ok) return []
    return parseTimeExtent(await res.text()).frames
  } catch {
    return []
  }
}
