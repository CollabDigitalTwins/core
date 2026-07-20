// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { fitGeoJsonBounds } from './fitGeojsonBounds'

import type { BuildingDataset } from '../../../../types/datasetTypes'

export class ClusterManager {
  private map: any

  constructor(map: any) {
    this.map = map
  }

  create(dataset: BuildingDataset) {
    const sourceId = `building-cluster-${dataset.name}`
    const clusterLayerId = `building-cluster-layer-${dataset.name}`
    const countLayerId = `building-cluster-count-${dataset.name}`
    const unclusteredLayerId = `building-unclustered-${dataset.name}`

    const geojson = {
      type: 'FeatureCollection',
      features: dataset.data
        .filter((b: any) => b.buildingLongitude && b.buildingLatitude)
        .map((b: any) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [b.buildingLongitude, b.buildingLatitude] },
          properties: b,
        })),
    }

    fitGeoJsonBounds(this.map, geojson)

    if (this.map.getSource(sourceId)) {
      (this.map.getSource(sourceId) as any).setData(geojson)
    }
    else {
      this.map.addSource(sourceId, {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      })

      this.map.addLayer({
        id: clusterLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': dataset.layerColor?.color || '#73cee2',
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            100,
            30,
            750,
            40,
          ],
        },
      })

      this.map.addLayer({
        id: countLayerId,
        type: 'symbol',
        source: sourceId,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#ffffff',
        },
      })

      this.map.addLayer({
        id: unclusteredLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': dataset.layerColor?.color || '#73cee2',
          'circle-radius': 6,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      })

      // Add cursor events for unclustered layer only
      this.map.on('mouseenter', unclusteredLayerId, () => {
        this.map.getCanvas().style.cursor = 'pointer'
      })
      this.map.on('mouseleave', unclusteredLayerId, () => {
        this.map.getCanvas().style.cursor = ''
      })
    }
  }

  remove(datasetName: string) {
    const unclusteredLayerId = `building-unclustered-${datasetName}`

    // Remove cursor events for unclustered layer
    this.map.off('mouseenter', unclusteredLayerId, () => {
      this.map.getCanvas().style.cursor = 'pointer'
    })
    this.map.off('mouseleave', unclusteredLayerId, () => {
      this.map.getCanvas().style.cursor = ''
    })

    const sourceId = `building-cluster-${datasetName}`
    const clusterLayerId = `building-cluster-layer-${datasetName}`
    const countLayerId = `building-cluster-count-${datasetName}`

    for (const layerId of [clusterLayerId, countLayerId, unclusteredLayerId]) {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId)
      }
    }

    if (this.map.getSource(sourceId)) {
      this.map.removeSource(sourceId)
    }
  }

  toggleVisibility(datasetName: string, visible: boolean) {
    const clusterLayerId = `building-cluster-layer-${datasetName}`
    const countLayerId = `building-cluster-count-${datasetName}`
    const unclusteredLayerId = `building-unclustered-${datasetName}`

    for (const layerId of [clusterLayerId, countLayerId, unclusteredLayerId]) {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
      }
    }
  }

  removeHiddenDatasets(addedDatasets: BuildingDataset[], isBuildingDataset: (dataset: any) => boolean) {
    for (const dataset of addedDatasets) {
      if (isBuildingDataset(dataset) && dataset.visible === false) {
        this.remove(dataset.name)
      }
    }
  }
}
