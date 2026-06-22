// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Dataset, FieldType } from '../../../../../types/datasetTypes'
import { formatName, stripHtml } from '../utils'
import { type AllGeoJSON } from '@turf/turf'
import { DataManagementSystem, type OpenDataPortal } from '../../../../../types/dbTypes'
import { buildValidationKey, getCache, setCache, withCache } from './cache'
import { layerColorByName } from '../../utils/stringToColour'

const inFlightFeatureRequests = new Map<string, Promise<AllGeoJSON>>()

export type ViewportOptions = {
  bbox?: [number, number, number, number] // [west, south, east, north]
  zoom?: number
}

async function fetchWithTimeout(url: string, timeout = 10_000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  }
  catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Run `fn` over `items` with at most `limit` concurrent executions.
 * Preserves order of results matching input order.
 */
async function withConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const i = next++
      try {
        results[i] = { status: 'fulfilled', value: await fn(items[i]) }
      }
      catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  )
  return results
}

export async function fetchArcGISDatasets(
  portal: OpenDataPortal,
  rowsPerPage: number,
): Promise<Dataset[]> {
  const { apiUrl, countrySubdivision, municipality, group } = portal

  try {
    const baseUrl = (apiUrl || '').replace(/\/+$/, '')
    const servicesUrl = `${baseUrl}/services?f=pjson`
    console.log(`[ArcGIS] Fetching services for portal "${portal.name}": ${servicesUrl}`)

    const response = await fetchWithTimeout(servicesUrl)
    if (!response.ok) {
      console.error(`[ArcGIS] "${portal.name}" services request failed — status ${response.status}`)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[ArcGIS] "${portal.name}" — ${data.services?.length ?? 0} services found`)

    const transformedDatasets: Dataset[] = []

    const processService = async (service: any): Promise<Dataset[]> => {
      const url = `${baseUrl}/services/${service.name}/${service.type}`
      const infoUrl = `${url}/info/itemInfo?f=pjson`

      const [infoRes, serviceRes] = await Promise.allSettled([
        fetchWithTimeout(infoUrl),
        fetchWithTimeout(`${url}?f=pjson`),
      ])

      let extraInfo: any = {}
      let serviceInfo: any = {}

      if (infoRes.status === 'fulfilled' && infoRes.value.ok)
        extraInfo = await infoRes.value.json()
      if (serviceRes.status === 'fulfilled' && serviceRes.value.ok)
        serviceInfo = await serviceRes.value.json()

      const layers = serviceInfo.layers && serviceInfo.layers.length > 0
        ? serviceInfo.layers.filter((l: any) => l.type === 'Feature Layer')
        : [{ id: 0, name: null, geometryType: null }]

      const hasNonNullGeometry = (featuresUrl: string, cacheKey: string): Promise<boolean> =>
        withCache<boolean>(cacheKey, 24 * 60 * 60 * 1000, async () => {
          try {
            const res = await fetchWithTimeout(`${featuresUrl}&resultRecordCount=1`)
            if (!res.ok) return false
            const d = await res.json()
            if (d?.error?.code || d?.error?.message) return false
            if (!d || d.type !== 'FeatureCollection' || !Array.isArray(d.features)) return false
            return d.features.some((f: any) => f && f.geometry)
          }
          catch { return false }
        })

      // Layers within a service are few (2-5 typically) — parallel is fine here
      const layerResults = await Promise.allSettled(
        layers.map(async (layer: any): Promise<Dataset | null> => {
          const layerIndex = layer.id
          const featuresUrl = `${url}/${layerIndex}/query?outFields=*&where=1%3D1&f=geojson`
          const featureInfoUrl = `${url}/${layerIndex}?f=pjson`

          const validKey = buildValidationKey(
            'arcgis',
            `${service.name}_${layerIndex}`,
            serviceInfo?.documentInfo?.ModifiedTime || extraInfo?.modified || undefined,
          )
          const hasGeom = await hasNonNullGeometry(featuresUrl, validKey)
          if (!hasGeom) return null

          const modTime = serviceInfo?.documentInfo?.ModifiedTime || extraInfo?.modified || ''

          /**
           * getFeatures — viewport-aware, paginated.
           * If `bbox` is provided, only features intersecting the viewport are fetched.
           * Automatically paginates beyond the per-page limit.
           */
          const getFeatures = async (options?: ViewportOptions): Promise<AllGeoJSON> => {
            const zoom = options?.zoom ?? 10
            const bbox = options?.bbox

            // Page size scales with zoom: fewer records at low zoom (overview), more at high zoom (detail)
            const pageSize = zoom < 6 ? 500 : zoom < 10 ? 1000 : 2000

            // Build spatial filter string for ArcGIS when viewport is available
            let spatialFilter = ''
            if (bbox) {
              const [west, south, east, north] = bbox
              const geomStr = encodeURIComponent(
                JSON.stringify({ xmin: west, ymin: south, xmax: east, ymax: north, spatialReference: { wkid: 4326 } }),
              )
              spatialFilter = `&geometry=${geomStr}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&inSR=4326`
            }

            // Round bbox to 0.1° grid to maximise cache hits while panning
            const bboxKey = bbox
              ? bbox.map(n => (Math.round(n * 10) / 10).toFixed(1)).join(',')
              : 'global'
            const zoomBucket = Math.floor(zoom / 2)
            const featuresKey = `features:arcgis:${service.name}_${layerIndex}:${bboxKey}:z${zoomBucket}:${modTime}`

            const cached = getCache<AllGeoJSON>(featuresKey)
            if (cached) return cached

            const inFlight = inFlightFeatureRequests.get(featuresKey)
            if (inFlight) return inFlight

            const baseQuery = `${url}/${layerIndex}/query?outFields=*&where=1%3D1&f=geojson${spatialFilter}`

            const request = (async () => {
              try {
                const firstRes = await fetchWithTimeout(`${baseQuery}&resultOffset=0&resultRecordCount=${pageSize}`, 15_000)
                if (!firstRes.ok) return { type: 'FeatureCollection', features: [] } as AllGeoJSON

                const firstPage = await firstRes.json()
                if (!firstPage?.features) return { type: 'FeatureCollection', features: [] } as AllGeoJSON

                const allFeatures = [...firstPage.features]

                // If the server returned fewer features than the requested page size, the first page is complete.
                // This avoids an unnecessary count request for small datasets that have already finished loading.
                if (firstPage.exceededTransferLimit && firstPage.features.length >= pageSize) {
                  try {
                    const countRes = await fetchWithTimeout(`${baseQuery}&returnCountOnly=true&f=json`, 5_000)
                    if (countRes.ok) {
                      const { count: total } = await countRes.json()
                      if (total > pageSize) {
                        // Cap at 10 additional pages (~20 000 records max) to avoid browser memory issues
                        const numPages = Math.min(Math.ceil((total - pageSize) / pageSize), 10)
                        const morePages = await Promise.all(
                          Array.from({ length: numPages }, (_, i) =>
                            fetchWithTimeout(
                              `${baseQuery}&resultOffset=${pageSize * (i + 1)}&resultRecordCount=${pageSize}`,
                              15_000,
                            )
                              .then(r => r.ok ? r.json() : null)
                              .then(p => p?.features ?? [])
                              .catch(() => []),
                          ),
                        )
                        for (const page of morePages) allFeatures.push(...page)
                      }
                    }
                  }
                  catch { /* use first page only */ }
                }

                const result = { type: 'FeatureCollection', features: allFeatures } as AllGeoJSON
                // Viewport-constrained results cached for 15 min; global results for 1 hr
                setCache(featuresKey, result, bbox ? 15 * 60 * 1000 : 60 * 60 * 1000)
                return result
              }
              catch (error) {
                console.error(`ArcGIS: Error fetching features for layer ${layerIndex}:`, error)
                return { type: 'FeatureCollection', features: [] } as AllGeoJSON
              }
              finally {
                inFlightFeatureRequests.delete(featuresKey)
              }
            })()

            inFlightFeatureRequests.set(featuresKey, request)
            return request
          }

          const getFeaturesData = async () => {
            try {
              const res = await fetchWithTimeout(`${url}/${layerIndex}?f=pjson`)
              return res.ok ? res.json() : undefined
            }
            catch { return undefined }
          }

          const getFields = async () => {
            try {
              const fieldsKey = `fields:arcgis:${service.name}:${layerIndex}:${modTime}`
              const cached = getCache<any[]>(fieldsKey)
              if (cached) return cached

              const res = await fetchWithTimeout(featureInfoUrl)
              if (!res.ok) return []
              const featureData = await res.json()
              if (!featureData.fields) return []

              const typeMap = esriFieldTypes()

              const nameBasedType = (raw: any): FieldType | undefined => {
                const lc = (raw.name || '').toLowerCase()
                if (/(percentage|percent|ratio|average)/.test(lc)) return 'number'
                if (/(date|year|month|day|time)/.test(lc)) return 'datetime'
                return undefined
              }

              const inferFieldType = (raw: any): FieldType => {
                const norm = ([raw.type, raw.actualType, raw.sqlType, raw.esriType] as (string | undefined)[])
                  .filter(Boolean).map(v => String(v).toLowerCase())
                if (norm.some(v => v.includes('boolean') || v === 'bool' || v === 'esrifieldtypeboolean')) return 'boolean'
                if (norm.some(v => /(double|float|integer|smallint|single|numeric|number|decimal)/.test(v)
                  || ['esrifieldtypeinteger', 'esrifieldtypesmallinteger', 'esrifieldtypedouble', 'esrifieldtypefloat', 'esrifieldtypesingle'].includes(v))) return 'number'
                if (norm.some(v => /(date|time|timestamp)/.test(v))) return 'datetime'
                if (norm.some(v => /(globalid|guid|objectid|^oid$|_id$|id$)/.test(v))) return 'id'
                if (norm.some(v => v.includes('blob'))) return 'blob'
                if (norm.some(v => v.includes('raster') || v.includes('geometry'))) return 'object'
                return 'string'
              }

              const mapped = featureData.fields.map((field: any) => {
                const rawEsriType = field.type
                const inferred = nameBasedType(field) || typeMap[rawEsriType]?.type || inferFieldType(field)
                return { ...field, esriType: rawEsriType, type: inferred }
              })
              setCache(fieldsKey, mapped, 24 * 60 * 60 * 1000)
              return mapped
            }
            catch { return [] }
          }

          const baseName = formatName(service.name)
          const layerName = layer.name || `Layer ${layerIndex}`
          const name = layers.length > 1 ? `${baseName} - ${layerName}` : baseName

          return {
            id: extraInfo.id ? `${extraInfo.id}_${layerIndex}` : `${service.name}_${layerIndex}`,
            name,
            type: Array.isArray(service.layers) && service.layers[0]?.geometryType
              ? service.layers[0].geometryType
              : extraInfo.type || 'Feature Layer',
            datasetType: 'GeoJSON',
            dataManagementSystem: DataManagementSystem.Arcgis,
            url,
            license: extraInfo.licenseInfo || 'Unknown',
            description: extraInfo.description ? stripHtml(extraInfo.description) : 'No description available',
            publisher: extraInfo.owner || 'Unknown',
            contact: extraInfo.contact || 'Unknown',
            keywords: extraInfo.tags || extraInfo.typedKeywords || [],
            subject: extraInfo.subject || [],
            countrySubdivision,
            municipality,
            getFields,
            getFeatures,
            getFeaturesData,
            group,
            portal,
            layerColor: layerColorByName(name),
          } satisfies Dataset
        }),
      )

      return layerResults
        .filter((r): r is PromiseFulfilledResult<Dataset> => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value)
    }

    // Process at most 5 services concurrently — prevents ArcGIS rate-limiting
    const serviceResults = await withConcurrencyLimit(data.services, 5, processService)

    for (const result of serviceResults) {
      if (result.status === 'fulfilled') transformedDatasets.push(...result.value)
    }

    return transformedDatasets
  }
  catch (error) {
    console.error(`[ArcGIS] Failed to fetch datasets for portal "${portal.name}":`, error)
    return []
  }
}

export interface EsriFieldTypes {
  [key: string]: { description: string, type: FieldType }
}

export function esriFieldTypes(): EsriFieldTypes {
  return {
    esriFieldTypeString: { description: 'Text Field', type: 'string' },
    esriFieldTypeGlobalID: { description: 'Global ID', type: 'id' },
    esriFieldTypeGUID: { description: 'Global UID', type: 'id' },
    esriFieldTypeSmallInteger: { description: '16-bit Integer', type: 'number' },
    esriFieldTypeInteger: { description: '32-bit Integer', type: 'number' },
    esriFieldTypeSingle: { description: 'Single Precision Float', type: 'number' },
    esriFieldTypeDouble: { description: 'Double Precision Float', type: 'number' },
    esriFieldTypeDate: { description: 'Date/Time', type: 'datetime' },
    esriFieldTypedOnly: { description: 'Date', type: 'datetime' },
    esriFieldTypeTimeOnly: { description: 'Time', type: 'string' },
    esriFieldTypeTimestampOffset: { description: 'Timestamp', type: 'string' },
    esriFieldTypeBlob: { description: 'Binary', type: 'blob' },
    esriFieldTypeRaster: { description: 'Raster', type: 'object' },
    esriFieldTypeXML: { description: 'XML', type: 'string' },
    esriFieldTypeGeometry: { description: 'Spatial Geometry', type: 'object' },
    esriFieldTypeOID: { description: 'Object ID', type: 'id' },
  }
}
