/**
 * Minimal ArcGIS Feature Service fetch helpers for the "Add dataset" URL import.
 *
 * Lifted from the connector SDK's `arcgis.ts`, trimmed to just what the URL
 * importer needs (`fetchWithTimeout` + `fetchArcGISLayerFeatures`). ArcGIS
 * supports `f=geojson` directly, so no Esri-JSON → GeoJSON conversion is needed.
 */

/** `fetch()` with an AbortController-backed timeout, chained to an optional caller signal. */
export async function fetchWithTimeout(
  url: string,
  timeoutMs = 10_000,
  signal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  }
  finally {
    clearTimeout(timeoutId)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}

/**
 * Page through every feature of an ArcGIS Feature Service layer as GeoJSON.
 * Yields features one at a time. `layerUrl` is the full layer endpoint, e.g.
 * `https://…/FeatureServer/0`.
 */
export async function* fetchArcGISLayerFeatures(
  layerUrl: string,
  opts: { pageSize?: number, maxPages?: number, signal?: AbortSignal } = {},
): AsyncIterable<GeoJSON.Feature> {
  const pageSize = opts.pageSize ?? 1000
  const maxPages = opts.maxPages ?? 50
  const base = `${layerUrl.replace(/\/+$/, '')}/query?outFields=*&where=1%3D1&f=geojson`

  for (let page = 0; page < maxPages; page++) {
    if (opts.signal?.aborted) return
    const url = `${base}&resultOffset=${page * pageSize}&resultRecordCount=${pageSize}`
    const res = await fetchWithTimeout(url, 15_000, opts.signal)
    if (!res.ok) throw new Error(`ArcGIS query failed: HTTP ${res.status}`)

    const json = await res.json() as {
      features?: GeoJSON.Feature[]
      exceededTransferLimit?: boolean
    }
    const features = json.features ?? []
    for (const feature of features) yield feature

    // Stop once the server returns a short page or stops flagging more data.
    if (features.length < pageSize || !json.exceededTransferLimit) return
  }
}
