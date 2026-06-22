// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Dataset } from '../../../../../types/datasetTypes'
import { formatDate, formatName, stripHtml } from '../utils'

import type { AllGeoJSON } from '@turf/turf'
import { buildValidationKey, getCache, setCache, withCache } from './cache'
import { layerColorByName } from '../../utils/stringToColour'
import { OpenDataPortal } from '../../../../../types/dbTypes'

// Fetch OpenDataSoft datasets and transform to Dataset array
export async function fetchOpenDataSoftDatasets(
  portal: OpenDataPortal,
): Promise<Dataset[]> {
  const { apiUrl, countrySubdivision, municipality, group } = portal
  const baseUrl = apiUrl.replace(/\/$/, '')
  const catalogBase = `${baseUrl}/catalog`
  const isServer = typeof window === 'undefined'

  const buildUrl = (target: string) => {
    if (isServer) {
      return target
    }
    return `/api/opendatasoftProxy?url=${encodeURIComponent(target)}`
  }

  try {
    let allDatasets: any[] = []
    let offset = 0
    let totalCount = 0

    do {
      const catalogUrl = `${catalogBase}/datasets?limit=100&offset=${offset}`
      const response = await fetch(buildUrl(catalogUrl))

      if (!response.ok) {
        console.error(`OpenDataSoft API error for ${portal.name}:`, response.status, response.statusText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // More flexible response structure handling
      if (!data) {
        throw new Error('Empty response from OpenDataSoft API')
      }

      // Handle different possible response structures
      let results: any[] = []
      let total = 0

      if (data.results && Array.isArray(data.results)) {
        // Standard OpenDataSoft v2 API response
        results = data.results
        total = data.total_count || data.nhits || 0
      }
      else if (data.datasets && Array.isArray(data.datasets)) {
        // Alternative response structure
        results = data.datasets
        total = data.total || data.count || 0
      }
      else if (Array.isArray(data)) {
        // Direct array response
        results = data
        total = data.length
      }
      else {
        // Log the actual structure for debugging
        console.error('Unexpected response structure:', Object.keys(data))
        throw new Error(
          `Invalid OpenDataSoft response structure. Expected 'results' array, got: ${Object.keys(
            data,
          ).join(', ')}`,
        )
      }
      allDatasets = allDatasets.concat(results)
      totalCount = total
      offset += 100

      // Safety check to prevent infinite loops
      if (results.length === 0) {
        break
      }
    } while (offset < totalCount)

    const transformedDatasets: Dataset[] = (await Promise.all(allDatasets.map(async (dataset: any) => {
      const metas = dataset.metas?.default || {}
      const custom = dataset.metas?.custom || {}
      const datasetId = dataset.dataset_id || dataset.id || ''
      const datasetModified = metas.modified || dataset.modified || undefined

      const datasetBaseUrl = `${catalogBase}/datasets/${datasetId}`
      const recordsBaseUrl = `${datasetBaseUrl}/records`

      const validKey = buildValidationKey('opendatasoft', datasetId, datasetModified)
      const isValid = await withCache<boolean>(validKey, 24 * 60 * 60 * 1000, async () => {
        try {
          const sampleUrl = `${recordsBaseUrl}?limit=1`
          const sampleRes = await fetch(buildUrl(sampleUrl))
          if (sampleRes.ok) {
            const sample = await sampleRes.json()
            if (sample?.error) {
              const code = sample.error.code
              const msg = `${sample.error.message || ''}`
              console.warn(`⚠️ OpenDataSoft validation: Dataset "${datasetId}" returned error:`, { code, msg })
              if ([401, 403, 499, 504].includes(code) || /unauthorized|forbidden|token required|timed out/i.test(msg)) return false
              // Even if there's an error, allow the dataset through - getFeatures will handle it
              return true
            }
            // If response is OK, check if it has geometry
            const recs = sample.records || sample.results || [];
            const hasGeom = Array.isArray(recs)
              ? recs.some((r: any) => !!r?.geometry || !!r?.geom || !!r?.geo_shape || !!r?.geo_point_2d)
              : false
            console.log(`ℹ️ OpenDataSoft validation: Dataset "${datasetId}" has geometry: ${hasGeom}, records: ${recs.length}`)
            // Allow through even if no geometry - user might want to see the dataset
            return true
          }
          else if ([401, 403, 504].includes(sampleRes.status)) {
            console.error(`❌ OpenDataSoft validation: Dataset "${datasetId}" auth/timeout error: ${sampleRes.status}`)
            return false
          }
          else {
            console.warn(`⚠️ OpenDataSoft validation: Dataset "${datasetId}" validation request failed: ${sampleRes.status}`)
            // Allow through on other errors
            return true
          }
        }
        catch (error) {
          console.error(`❌ OpenDataSoft validation: Dataset "${datasetId}" validation failed:`, error)
          // Allow through on network errors - getFeatures will handle it
          return true
        }
      })

      if (!isValid) {
        console.log(`🗑️ OpenDataSoft: Filtering out dataset "${datasetId}" - validation failed`)
        return null
      }

      // Self-contained getFields
      const getFields = async () => {
        const fieldsKey = `fields:opendatasoft:${datasetId}:${datasetModified ?? ''}`
        const cached = getCache<any[]>(fieldsKey)
        if (cached) return cached
        const fieldsUrl = `${datasetBaseUrl}`
        const response = await fetch(buildUrl(fieldsUrl))
        if (!response.ok) return []
        const data = await response.json()
        const fields = (data.metas?.default?.fields || data.fields || []).map((field: any) => ({
          name: field.name,
          label: field.label || field.name,
          type: field.type,
          description: field.description || '',
        }))
        setCache(fieldsKey, fields, 24 * 60 * 60 * 1000)
        return fields
      }

      // Self-contained getFeatures with caching
      const getFeatures = async (): Promise<AllGeoJSON> => {
        const featuresKey = `features:opendatasoft:${datasetId}:${datasetModified ?? ''}`
        const cached = getCache<AllGeoJSON>(featuresKey)
        if (cached) {
          const cachedCount = 'features' in cached ? cached.features?.length ?? 0 : 0
          console.log(`✅ OpenDataSoft getFeatures: Returning ${cachedCount} cached features for dataset "${datasetId}"`)
          return cached
        }

        try {
          const features: any[] = []
          let offset = 0
          let totalCount = 0
          const maxFeatures = 5_000

          console.log(`🔍 OpenDataSoft getFeatures: Starting fetch for dataset "${datasetId}"`)

          do {
            const recordsUrl = `${recordsBaseUrl}?limit=100&offset=${offset}`
            console.log(`📡 OpenDataSoft: Fetching ${recordsUrl}`)
            const response = await fetch(buildUrl(recordsUrl))
            if (!response.ok) {
              console.error(`❌ OpenDataSoft: Failed to fetch records - status ${response.status}`, {
                url: recordsUrl,
                statusText: response.statusText,
              })
              break
            }
            let data;
            try {
              data = await response.json()
            } catch (parseError) {
              console.error(`❌ OpenDataSoft: Failed to parse JSON response:`, parseError)
              break
            }
            console.log(`📦 OpenDataSoft: Received data, records count: ${data.records?.length || 0}, data keys:`, Object.keys(data || {}))

            if (offset === 0) {
              totalCount = Math.min(data.total_count || data.nhits || 0, maxFeatures)
            }

            const recArray: any[] = data.records || data.results || [];
            if (Array.isArray(recArray)) {
              recArray.forEach((record: any) => {
                if (features.length >= maxFeatures) return;

                // Extract geometry from possible fields
                let geom: any = null;
                if (record.geometry) {
                  geom = record.geometry;
                } else if (record.geom) {
                  geom = record.geom.type === 'Feature' && record.geom.geometry ? record.geom.geometry : record.geom;
                } else if (record.geo_shape) {
                  geom = record.geo_shape;
                } else if (record.geo_point_2d && typeof record.geo_point_2d.lat === 'number' && typeof record.geo_point_2d.lon === 'number') {
                  geom = { type: 'Point', coordinates: [record.geo_point_2d.lon, record.geo_point_2d.lat] };
                }

                if (geom) {
                  const props: any = { ...record };
                  delete props.geometry;
                  delete props.geom;
                  delete props.geo_shape;
                  delete props.geo_point_2d;

                  features.push({
                    type: 'Feature',
                    geometry: geom,
                    properties: props,
                  });
                }
              });
            }

            offset += 100
            const fetchedCount = recArray.length;
            if (fetchedCount === 0 || features.length >= maxFeatures) break
          } while (offset < totalCount)

          console.log(`✅ OpenDataSoft getFeatures: Returning ${features.length} features for dataset "${datasetId}"`)

          const result = {
            type: 'FeatureCollection',
            features,
          } as AllGeoJSON

          // Cache the result for 1 hour
          setCache(featuresKey, result, 60 * 60 * 1000)

          return result
        } catch (error) {
          console.error(`❌ OpenDataSoft getFeatures: Error fetching features for dataset "${datasetId}":`, error)
          // Return empty feature collection on error instead of throwing
          return {
            type: 'FeatureCollection',
            features: [],
          } as AllGeoJSON
        }
      }

  const name = formatName(metas.title || dataset.title || datasetId)

      return {
        id: datasetId,
        name,
        publisher:
          metas.publisher
          || custom['data-owner']?.[0]
          || dataset.publisher
          || 'Unknown',
        dataManagementSystem: 'Opendatasoft',
        license: metas.license || dataset.license || 'Unknown',
        contact: custom['data-team']?.[0] || dataset.contact || 'Unknown',
        keywords: metas.keyword || dataset.keywords || [],
        description: stripHtml(
          metas.description || dataset.description || 'No description available',
        ),
        dateReleased: metas.created
          ? formatDate(metas.created)
          : (dataset.created
              ? formatDate(dataset.created)
              : ''),
        dateUpdated: metas.modified
          ? formatDate(metas.modified)
          : (dataset.modified
              ? formatDate(dataset.modified)
              : ''),
        information: `${apiUrl}/explore/dataset/${datasetId}/`,
        countrySubdivision,
        municipality,
        type: portal.name,
        datasetType: dataset.type || 'GeoJSON',
        portal,
        getFields,
        getFeatures,
        group,
        layerColor: layerColorByName(name),
      }
    })))
    .filter(Boolean) as Dataset[]

    return transformedDatasets
  }
  catch (error) {
    console.error(`Error fetching OpenDataSoft datasets for ${portal.name}:`, error)
    return []
  }
}
