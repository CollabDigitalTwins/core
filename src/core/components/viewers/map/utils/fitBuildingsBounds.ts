
import type { Map } from 'maplibre-gl'
import * as turf from '@turf/turf'
import { Building, Site } from '../../../../types/dbTypes'

export const fitBuildingsBounds = (buildings: Building[], map: Map) => {
  // Collect valid building coordinates
  const coordinates: [number, number][] = []
  for (const building of buildings) {
    if (building.buildingLongitude != null && building.buildingLatitude != null) {
      coordinates.push([building.buildingLongitude, building.buildingLatitude])
    }
  }

  // Calculate bounding box of all coordinates
  const bbox = turf.bbox(turf.featureCollection(
    coordinates.map((coord: [number, number]) => turf.point(coord)),
  ))

  if (map && bbox && buildings.length > 0) {
    map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], {
      duration: 1000,
      maxZoom: 18,
      padding: 10,
    })
  }
}
export const fitSitesBounds = (sites: Site[], map: Map) => {
  // Collect valid site coordinates
  const coordinates: [number, number][] = []
  for (const site of sites) {
    if (site.siteLongitude != null && site.siteLatitude != null) {
      coordinates.push([site.siteLongitude, site.siteLatitude])
    }
  }

  // Calculate bounding box of all coordinates
  const bbox = turf.bbox(turf.featureCollection(
    coordinates.map((coord: [number, number]) => turf.point(coord)),
  ))

  if (map && bbox && sites.length > 0) {
    map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], {
      duration: 1000,
      maxZoom: 18,
      padding: 10,
    })
  }
}
