// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

'use client'

import { useTranslations } from 'next-intl'
import * as React from 'react'


import type { PopupEntry } from '../../../../../../types/map'
import type { MapLayerClickPriority } from '../../../utils/MapEventManager/MapClickManager'
import type { Map, MapGeoJSONFeature } from 'maplibre-gl'

interface ClusterSpec {
  map: Map
  sourceId: string
  layerId: string
  clusterId: number
  count: number
  coordinates: [number, number]
  title: string
  priority: MapLayerClickPriority
  leafLabel: (feature: MapGeoJSONFeature) => string
}

const ClusterPopupBody = ({ header, map, sourceId, clusterId, count, coordinates, title, leafLabel }: ClusterSpec & { header?: React.ReactNode }) => {
  const t = useTranslations('MapPopupStack')
  const [leaves, setLeaves] = React.useState<MapGeoJSONFeature[]>([])

  React.useEffect(() => {
    let cancelled = false
    const source = map.getSource(sourceId) as any
    source?.getClusterLeaves(clusterId, Infinity, 0)
      .then((found: MapGeoJSONFeature[]) => {
        if (!cancelled) setLeaves(found)
      })
      .catch(() => {
        if (!cancelled) setLeaves([])
      })
    return () => { cancelled = true }
  }, [map, sourceId, clusterId])

  const zoomToExpand = () => {
    const source = map.getSource(sourceId) as any
    source?.getClusterExpansionZoom(clusterId)
      .then((zoom: number) => map.easeTo({ center: coordinates, zoom }))
      .catch(() => {})
  }

  return (
    // globals.css makes the popup surface transparent with no close button, so every body brings its own card.
    <div className="flex max-h-72 w-64 flex-col rounded-[15px] border bg-popover p-1 text-popover-foreground shadow-md">
      {header}
      <p className="truncate px-3 pt-2.5 text-sm font-medium" title={title}>{title}</p>
      <p className="px-3 pb-1.5 text-xs text-muted-foreground">{t('clusterContents', { count })}</p>
      <ul className="min-h-0 flex-1 overflow-y-auto border-t px-3 py-1.5 text-xs">
        {leaves.map((leaf, index) => (
          <li className="truncate py-0.5" key={`${String(leaf.properties?.id)}-${index}`}>
            {leafLabel(leaf)}
          </li>
        ))}
      </ul>
      <div className="border-t p-2">
        <button
          className="w-full rounded border px-2 py-1 text-xs hover:bg-muted"
          onClick={zoomToExpand}
          type="button"
        >
          {t('zoomToExpand')}
        </button>
      </div>
    </div>
  )
}

/** One entry for a whole cluster: a 143-point cluster must not become 143 switcher steps. */
export const buildClusterEntry = (spec: ClusterSpec): PopupEntry => ({
  id: `${spec.layerId}:cluster:${spec.clusterId}`,
  layerId: spec.layerId,
  priority: spec.priority,
  title: spec.title,
  coordinates: spec.coordinates,
  render: (header) => <ClusterPopupBody header={header} {...spec} />,
})

export const clusterSpecFromFeature = (
  feature: MapGeoJSONFeature,
): { clusterId: number; count: number; coordinates: [number, number] } | null => {
  const clusterId = feature.properties?.cluster_id
  if (clusterId == null) return null
  if (!('coordinates' in feature.geometry)) return null
  return {
    clusterId: Number(clusterId),
    count: Number(feature.properties?.point_count ?? 0),
    coordinates: feature.geometry.coordinates as [number, number],
  }
}
