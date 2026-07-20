'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { MapContext, MenusContext } from '../../../../../../../store'
import * as React from 'react'
import { Source, Layer, Popup, Marker } from 'react-map-gl/maplibre'
import type { MapGeoJSONFeature, MapLayerMouseEvent } from 'maplibre-gl'
import Sensor from '../../../../../../ui/Sensors/Sensor'
import { SensorType, ViewerNames, type Sensor as ISensor} from '../../../../../../../types/dbTypes'

import { MapLayerClickPriority, ClickCallback } from '../../../../utils/MapEventManager/MapClickManager'
import { extractCoordinatesFromFeature } from '../../../../utils/extractCoordinates'
import { useSensor, useSensors } from '../../../../../../../hooks/sensors/sensors'
import { useUsers } from '../../../../../../../hooks/users/users'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { createClusterLayer, createClusterCountLayer, createUnclusteredPointLayer } from '../mapLayersUtils'
import { useSensorTypes } from '../../../../../../../hooks/sensorTypes/sensorTypes'
import * as LR from 'lucide-react'
import { UNTAGGED_TAG } from '../../../../../../ui/Sensors/SensorsSection'

const SensorIconMarker = ({ feature, isHighlighted, onMouseEnter, onMouseLeave, sensorTypes }: { feature: MapGeoJSONFeature; isHighlighted?: boolean; onMouseEnter?: () => void; onMouseLeave?: () => void; sensorTypes: SensorType[] }) => {

  const coords = extractCoordinatesFromFeature(feature)
  if (!coords) return null

  const sensorType = sensorTypes.find(t => t.id === feature.properties?.typeId)
  const icon = sensorType?.icon || 'Radio'
  const SensorIcon = LR[icon] || LR.Radio

  return (
    <Marker key={String(feature.properties?.id ?? `${coords.lng},${coords.lat}`)} longitude={coords.lng} latitude={coords.lat} anchor="center">
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: isHighlighted ? '3px solid #73cee2' : '2px solid white',
          backgroundColor: 'black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isHighlighted ? '0 0 12px rgba(115, 206, 226, 0.5)' : 'none',
          transition: 'all 0.2s ease-in-out',
          transform: isHighlighted ? 'scale(1.2)' : 'scale(1)',
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <SensorIcon style={{ width: '20px', height: '20px', color: 'hsl(var(--primary-foreground))' }} />
      </div>
    </Marker>
  )
}

export const SensorLayers = ({ minioBaseUrl }: { minioBaseUrl?: string }) => {
    const [hoveredSensorId, setHoveredSensorId] = React.useState<number | null>(null)
  const clusterLayer = createClusterLayer('sensors')
  const clusterCountLayer = createClusterCountLayer('sensors')
  const unclusteredPointLayer = createUnclusteredPointLayer('sensors')

  // global map state

  const t = useTranslations('SensorLayers')
  const tSensors = useTranslations('SensorsSection')

  const { state: mapState } = React.useContext(MapContext)
  const { map, mapClickManager } = mapState.map
  const { sensors } = useSensors()
  const { users } = useUsers()
  const user = useSession().data?.user

  const [popupInfo, setPopUpInfo] = React.useState<Partial<ISensor & { sensorType: SensorType }> | null>(null)
  const { deleteSensor, updateSensor } = useSensor(popupInfo?.id ?? null)
  const { state: menusState } = React.useContext(MenusContext)
  const { visibleSensorTypes, visibleSensorTags, currentSensorId } = menusState.menus
  const typesVisible = visibleSensorTypes?.[ViewerNames.map] || []
  const tagsVisible = visibleSensorTags?.[ViewerNames.map] || []

  const {sensorTypes} = useSensorTypes()

  const eligibleSensors: Array<ISensor & { authorName: string } & { sensorType: SensorType }> = sensors
    .filter((sensor) => sensor.viewer === ViewerNames.map)
    .filter((sensor) => {
      const matchesType = typesVisible.includes(sensor.typeId)
      const hasNoTags = !sensor.tags?.length
      const matchesTag = hasNoTags
        ? tagsVisible.includes(UNTAGGED_TAG)
        : sensor.tags?.some(tag => tagsVisible.includes(tag)) ?? false
      return matchesType || matchesTag
    })
    .map((sensor) => {
      const user = users.find(u => u.id === sensor.authorId)
      const sensorType = sensorTypes.find(t => t.id === sensor.typeId)
      return {
        ...sensor,
        authorName: user?.name ?? 'Unknown User',
        sensorType,
      }
    })

  // Close popup if the sensor was deleted
  React.useEffect(() => {
    if (popupInfo && !sensors.find((s) => s.id === popupInfo.id)) {
      setPopUpInfo(null)
    }
  }, [sensors, popupInfo])

  const geojsonSensorData = React.useMemo(() => {
    const convertDataToGeojson = (sensorData: typeof eligibleSensors): GeoJSON.FeatureCollection<GeoJSON.Point, { [key: string]: any }> => {
      const sensorFeatures: GeoJSON.Feature<GeoJSON.Point, { [key: string]: any }>[] = sensorData
        .map((sensor) => {
          const { longitude, latitude, id, name, typeId, sensorType, data, dataFormat, updateFrequency, createdAt, authorId, organizationId, visible, url, authorName } = sensor

          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            properties: {
              id: Number(id),
              organizationId,
              visible,
              longitude,
              latitude,
              authorId: Number(authorId),
              authorName,
              name,
              typeId: Number(typeId),
              typeIcon: sensorType?.icon,
              data,
              dataFormat,
              updateFrequency,
              url,
              createdAt,
              viewer: ViewerNames.map,
            },
          }
        })



      const sensorFC: GeoJSON.FeatureCollection<GeoJSON.Point, { [key: string]: any }> = {
        type: 'FeatureCollection',
        features: sensorFeatures,
      }
      return sensorFC
    }
    return convertDataToGeojson(eligibleSensors)
  }, [eligibleSensors])

  // event listeners for sensor unclustered points
  React.useEffect(() => {
    if (!map) return
    const showSensorPopUp: ClickCallback = (e: MapLayerMouseEvent, features: MapGeoJSONFeature[]) => {
      const feature = features?.[0]

      if (!feature || feature.properties.point_count) return

      if (feature.geometry.type != 'Point') return
      const [longitude, latitude] = feature.geometry.coordinates
      const { id, authorId, name, typeId, data, dataFormat, updateFrequency, createdAt, url } = feature.properties
      setPopUpInfo({
        id: Number(id),
        authorId: Number(authorId),
        organizationId: feature.properties?.organizationId,
        visible: feature.properties?.visible,
        longitude,
        latitude,
        name,
        typeId: Number(typeId),
        data,
        dataFormat,
        updateFrequency,
        url,
        createdAt,
        viewer: ViewerNames.map,
      })
    }

    const mouseEnterChangeCursor = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const mouseLeaveChangeCursor = () => {
      map.getCanvas().style.cursor = ''
    }

    // event listener for clicking on single point to show sensor, hover to change cursor
    mapClickManager.register('sensors-unclustered-points', MapLayerClickPriority.CommentLayersClickPriority, showSensorPopUp)

    map.on('mouseenter', 'sensors-unclustered-points', mouseEnterChangeCursor)
    map.on('mouseleave', 'sensors-unclustered-points', mouseLeaveChangeCursor)
    return () => {
      mapClickManager.unregister('sensors-unclustered-points')
      map.off('mouseenter', 'sensors-unclustered-points', mouseEnterChangeCursor)
      map.off('mouseleave', 'sensors-unclustered-points', mouseLeaveChangeCursor)
    }
  }, [map, mapClickManager])

  const handleRemoveSensor = () => {
    toast.success(t('sensorDeleted'))
    deleteSensor()
    setPopUpInfo(null)
  }

  // event listeners for clustered points
  React.useEffect(() => {
    if (!map) return

    const zoomInToDecluster = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0] // only proceed if this is actually a cluster
      if (!feature || !feature.properties.cluster_id) return

      const clusterId = feature.properties.cluster_id as number

      // Check if geometry has coordinates (not a GeometryCollection)
      if (!('coordinates' in feature.geometry)) return
      const [lng, lat] = feature.geometry.coordinates as [number, number]

      const source = map.getSource('sensors') as any
      console.log(source)
      console.log(clusterId)
      source.getClusterExpansionZoom(clusterId).then(
        (zoom: number) => {
          console.log('easing to')
          map.easeTo({ center: [lng, lat], zoom })
        },
      )
        .catch((error) => {
          console.error(error)
        })
    }

    const mouseEnterChangeCursor = () => { map.getCanvas().style.cursor = 'pointer' }
    const mouseLeaveChangeCursor = () => { map.getCanvas().style.cursor = '' }

    // event listener for clicking on single point to zoom in and decluster, hover to change cursor
    map.on('click', 'sensors-clusters', zoomInToDecluster)
    map.on('mouseenter', 'sensors-clusters', mouseEnterChangeCursor)
    map.on('mouseleave', 'sensors-clusters', mouseLeaveChangeCursor)
    return () => {
      map.off('click', 'sensors-clusters', zoomInToDecluster)
      map.off('mouseenter', 'sensors-clusters', mouseEnterChangeCursor)
      map.off('mouseleave', 'sensors-clusters', mouseLeaveChangeCursor)
    }
  }, [map])

  const renderPopup = () => {
    if (!popupInfo) return null
    const sensorType = sensorTypes.find(t => t.id === popupInfo.typeId)
    const liveSensor = sensors.find(s => s.id === popupInfo.id)
    const dataUrl = popupInfo.url
      ? `${minioBaseUrl ?? ''}/sensors/${popupInfo.url}`
      : popupInfo.data || ''

    return (
      <Popup
        className="noBorderPopup"
        longitude={popupInfo.longitude}
        latitude={popupInfo.latitude}
        closeOnClick={false}
        onClose={() => setPopUpInfo(null)}
        anchor="bottom"
        style={{ height: '50px', border: 'none', boxShadow: 'none' }}
        offset={[0, 10]}
      >
        <Sensor
          sensorName={popupInfo.name || ''}
          sensorType={sensorType}
          sensorId={popupInfo.id}
          tags={liveSensor?.tags ?? []}
          onAddTag={async (tag) => { await updateSensor({ tags: [...(liveSensor?.tags ?? []), tag] }) }}
          onDeleteTag={async (tag) => { await updateSensor({ tags: (liveSensor?.tags ?? []).filter(t => t !== tag) }) }}
          tagsTranslations={{
            addTag: tSensors('addTag'),
            removeTag: tSensors('removeTag'),
            cancel: tSensors('cancel'),
            newTagPlaceholder: tSensors('newTagPlaceholder'),
          }}
          dataUrl={dataUrl}
          dataFormat={popupInfo.dataFormat}
          updateFrequency={popupInfo.updateFrequency}
          buildingId={popupInfo.buildingId}
          createdAt={popupInfo.createdAt}
          onRemove={user.id === String(popupInfo.authorId) ? handleRemoveSensor : null}
          onClose={() => setPopUpInfo(null)}
          size="sm"
        />
        {/* inline styles to override MapLibre's Pop up CSS */}
        <style>
          {`
              .noBorderPopup .maplibregl-popup-content {
                border: none !important;
                box-shadow: none !important;
                background: transparent !important;
              }
              .noBorderPopup .maplibregl-popup-tip {
                display: none !important;
              }
            `}
        </style>
      </Popup>
    )
  }

  // Track unclustered sensors to display icons
  const [unclusteredFeatures, setUnclusteredFeatures] = React.useState<MapGeoJSONFeature[]>([])

  React.useEffect(() => {
    if (!map) return

    const updateUnclusteredFeatures = () => {
      const allFeatures = map.querySourceFeatures('sensors')
      const unclusteredOnly = allFeatures.filter(
        (f) => !f.properties?.cluster && !f.properties?.point_count
      )
      // Deduplicate by id
      const uniqueFeatures = new Map()
      unclusteredOnly.forEach((f) => uniqueFeatures.set(f.properties.id, f))
      setUnclusteredFeatures(Array.from(uniqueFeatures.values()))
    }

    const onSourceData = (e: any) => {
      if (e?.sourceId === 'sensors') updateUnclusteredFeatures()
    }

    map.on('sourcedata', onSourceData)
    map.on('moveend', updateUnclusteredFeatures)
    map.on('zoomend', updateUnclusteredFeatures)

    updateUnclusteredFeatures()

    return () => {
      map.off('sourcedata', onSourceData)
      map.off('moveend', updateUnclusteredFeatures)
      map.off('zoomend', updateUnclusteredFeatures)
    }
  }, [map])

  return (
    <>
  {(typesVisible.length > 0 || tagsVisible.length > 0) &&
    <Source
      id="sensors"
      type="geojson"
      data={geojsonSensorData}
      cluster={true}
      clusterMaxZoom={14}
      clusterRadius={40}
    >
      <Layer {...clusterLayer} />
      <Layer {...clusterCountLayer} />
      <Layer {...unclusteredPointLayer} />

      {renderPopup()}
      {unclusteredFeatures
        .filter((feature) => feature.properties?.id !== popupInfo?.id)
        .map((feature) => (
          <SensorIconMarker
            key={String(feature.properties?.id)}
            feature={feature}
            isHighlighted={currentSensorId === feature.properties?.id || hoveredSensorId === feature.properties?.id}
            onMouseEnter={() => setHoveredSensorId(feature.properties?.id)}
            onMouseLeave={() => setHoveredSensorId(null)}
            sensorTypes={sensorTypes}
          />
        ))}
    </Source>}
    </>
  )
}
