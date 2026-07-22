// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { layerColorByName } from '../../utils/stringToColour'
import { formatName, stripHtml } from '../utils'

import { buildValidationKey, getCache, setCache, withCache } from './cache'

import type { Dataset, FieldType } from '../../../../../types/datasetTypes'
import type { OpenDataPortal } from '../../../../../types/dbTypes'
import type { AllGeoJSON } from '@turf/turf'




// Fetch CKAN GeoJSON datasets and transform to Dataset array
export async function fetchCkanDatasets(
  portal: OpenDataPortal,
): Promise<Dataset[]> {
  const { apiUrl, countrySubdivision, municipality, group } = portal
  const isServer = typeof window === 'undefined'

  const buildUrl = (target: string) => {
    if (isServer) {
      return target
    }

    const proxied = `/api/ckanProxy?url=${encodeURIComponent(target)}`
    return proxied
  }

  // https://www.donneesquebec.ca/recherche/dataset/?sort=metadata_created+desc&_organization_limit=0&res_format=GeoJSON

  try {
    // Use your local API route to proxy the CKAN request when on the client
    const geoJsonListTarget = `${apiUrl}/api/3/action/package_search?fq=res_format:(geojson OR GeoJSON)&rows=100000`
    const response = await fetch(buildUrl(geoJsonListTarget))

    if (!response.ok) {
      return []
    }

    const data = await response.json()

    if (!data.success || !data.result || !Array.isArray(data.result.results)) {
      throw new Error('Invalid CKAN response structure')
    }

    const transformedDatasets: Dataset[] = (
      await Promise.all(
        data.result.results.map(async (pkg: any) => {
          // Find first GeoJSON resource
          const geoJsonResource = pkg.resources?.find(
            (resource: any) => resource.format?.toLowerCase() === 'geojson',
          )

          // Exclude if no GeoJSON resource
          if (!geoJsonResource) return

          // Exclude if not active
          const datastore = geoJsonResource.datastore_active?.toString().toLowerCase() === 'true'
          const isActive = datastore || geoJsonResource.state === 'active'
          if (!(datastore && geoJsonResource.url && isActive)) return

          // Determine the correct URL based on your working method
          let resourceUrl: string | null = null
          let resourceTarget: string | null = null
          let fieldsUrl: string | null = null

          if (datastore) {
            resourceTarget = `${apiUrl}/api/3/action/datastore_search?resource_id=${geoJsonResource.id}&limit=1000000`
            resourceUrl = buildUrl(resourceTarget)
            fieldsUrl = buildUrl(`${apiUrl}/api/3/action/datastore_search?resource_id=${geoJsonResource.id}&limit=0`)
          }
          else {
            resourceTarget = geoJsonResource.url
            resourceUrl = resourceTarget ? buildUrl(resourceTarget) : null
          }

          try {
            const sampleTarget = resourceTarget?.includes('datastore_search')
              ? resourceTarget.replace('limit=1000000', 'limit=1')
              : resourceTarget
            const sampleUrl = sampleTarget
              ? (sampleTarget.includes('limit=') ? buildUrl(sampleTarget) : buildUrl(`${sampleTarget}?limit=1`))
              : null

            if (sampleUrl) {
              const validKey = buildValidationKey('ckan', pkg.id, pkg.metadata_modified || pkg.metadata_created || undefined)
              const isValid = await withCache<boolean>(validKey, 24 * 60 * 60 * 1000, async () => {
                const sampleRes = await fetch(sampleUrl)
                if (sampleRes.ok) {
                  const sample = await sampleRes.json()
                  if (sample?.error) {
                    const code = sample.error.code
                    const msg = `${sample.error.message || ''} ${sample.error.messageCode || ''}`
                    if (code === 499 || code === 504 || /token required|unauthorized|forbidden|timed out/i.test(msg)) return false
                  }
                  let hasGeom = true
                  if (sample?.result?.records) {
                    const rec = sample.result.records[0]
                    const geom = rec?.geometry || (typeof rec?.geometry === 'string' ? JSON.parse(rec.geometry) : undefined)
                    hasGeom = !!geom
                  }
                  else if (Array.isArray(sample?.features)) {
                    hasGeom = sample.features.some((f: any) => f && f.geometry)
                  }
                  return !!hasGeom
                } else if ([401, 403, 504].includes(sampleRes.status)) {
                  return false
                }
                return false
              })
              if (!isValid) return
            }
          }
          catch {
          }

          const getFeaturesData = async () => {
            if (resourceUrl) {
              try {
                const response = await fetch(fieldsUrl ?? resourceUrl)
                if (!response.ok) {
                  console.error('Network response was not ok:', response.status)
                  return
                }
                return await response.json()
              }
              catch (error) {
                console.error('Error fetching features data:', error)
                return
              }
            }
          }

          const getFields = async () => {
            if (fieldsUrl) {
              try {
                const fieldsKey = `fields:ckan:${geoJsonResource.id}:${pkg.metadata_modified || pkg.metadata_created || ''}`
                const cached = getCache<any[]>(fieldsKey)
                if (cached) return cached
                const dsRes = await fetch(fieldsUrl)
                if (dsRes.ok) {
                  const dsData = await dsRes.json()
                  const fields = (
                    dsData.result.fields?.map((field: any) => ({
                      name: field.id,
                      type: ckanFieldTypes[field.type]?.type || field.type,
                      ckanType: field.type,
                      description: field.info || '',
                    })) || []
                  )
                  setCache(fieldsKey, fields, 24 * 60 * 60 * 1000)
                  return fields
                }
              }
              catch {
                return []
              }
            }
            return []
          }

          const getFeatures: () => Promise<AllGeoJSON> = async () => {
            // Check cache first
            const featuresKey = `features:ckan:${geoJsonResource.id}:${pkg.metadata_modified || pkg.metadata_created || ''}`
            const cached = getCache<AllGeoJSON>(featuresKey)
            if (cached) {
              return cached
            }

            const limit = 5_000
            const url2 = resourceUrl?.includes('datastore_search')
              ? `${resourceUrl}&limit=${limit}`
              : resourceUrl

            try {
              const response = await fetch(url2)
              if (!response.ok) {
                console.error('CKAN: Network response was not ok:', response.status)
                return {
                  type: 'FeatureCollection',
                  features: [],
                } as AllGeoJSON
              }
              const data = await response.json()
              let featuresCollection: AllGeoJSON | undefined

              if (data.result && Array.isArray(data.result.records)) {
                // CKAN Datastore: build FeatureCollection from records
                const features = data.result.records
                  .map((properties: any) => {
                    try {
                      let geometry
                      geometry = properties.geometry?.type ? properties.geometry : JSON.parse(properties.geometry)

                      return {
                        type: 'Feature',
                        geometry,
                        properties,
                      }
                    }
                    catch {
                      return null
                    }
                  })
                  .filter((f: any) => f !== null)

                featuresCollection = {
                  type: 'FeatureCollection',
                  features,
                }
              }
              else if (
                data.type === 'FeatureCollection'
                && Array.isArray(data.features)
              ) {
                // Already a FeatureCollection
                featuresCollection = data
              }
              else {
                console.error(
                  'CKAN: No features available or unexpected response:',
                  data,
                )
                return {
                  type: 'FeatureCollection',
                  features: [],
                } as AllGeoJSON
              }

              // Cache the result for 1 hour
              if (featuresCollection) {
                setCache(featuresKey, featuresCollection, 60 * 60 * 1000)
              }

              return featuresCollection
            }
            catch (error) {
              console.error('CKAN: Error processing dataset:', error)
              return {
                type: 'FeatureCollection',
                features: [],
              } as AllGeoJSON
            }
          }

          const name = formatName(pkg.title || pkg.name)

          return {
            id: pkg.id,
            name,
            url: fieldsUrl,
            publisher:
              pkg.organization?.title || pkg.organization?.name || 'Unknown',
            dataManagementSystem: 'ckan',
            license: pkg.license_title || pkg.license_id || 'Unknown',
            contact: pkg.author || pkg.maintainer || 'Unknown',
            keywords: pkg.tags?.map((tag: any) => tag.name) || [],
            description: pkg.notes
              ? stripHtml(pkg.notes)
              : 'No description available',
            dateReleased: pkg.metadata_created || '',
            dateUpdated: pkg.metadata_modified || '',
            information: pkg.information_url || '',
            countrySubdivision,
            municipality,
            type: pkg.type || 'GeoJSON',
            portal,
            getFields,
            getFeatures,
            getFeaturesData,
            group,
            layerColor: layerColorByName(name),
          }
        }),
      )
    ).filter(Boolean) // Remove nulls (excluded datasets)

    return transformedDatasets
  }
  catch (error) {
    console.error('Error fetching CKAN GeoJSON datasets:', error)
    return []
  }
}

export interface CkanFieldTypes {
  [key: string]: { description: string, type: FieldType }
}

function ckanFieldTypes(): CkanFieldTypes {
  return {
    text: { description: 'Text', type: 'string' },
    int: { description: 'Integer', type: 'number' },
    float: { description: 'Float', type: 'number' },
    bool: { description: 'Boolean', type: 'boolean' },
    date: { description: 'Date', type: 'datetime' },
    timestamp: { description: 'Timestamp', type: 'datetime' },
    json: { description: 'JSON', type: 'object' },
    // Add more CKAN field types as needed
  }
}
