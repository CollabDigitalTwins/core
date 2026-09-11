'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { Source, Layer, Marker } from 'react-map-gl/maplibre'
import { toast } from 'sonner'

import { useSensor, useSensors } from '../../../../../../../hooks/sensors/sensors'
import { useSensorTypes } from '../../../../../../../hooks/sensorTypes/sensorTypes'
import { useUsers } from '../../../../../../../hooks/users/users'
import { AppConfigContext, MapContext, MenusContext } from '../../../../../../../store'
import { ViewerNames, type Sensor as ISensor} from '../../../../../../../types/dbTypes'
import { withAlpha } from '../../../../../../../utils/colourUtils'
import { HIGHLIGHT_COLOR, markerOcclusionProps } from '../../../../../../../utils/markerUtils'
import Sensor from '../../../../../../ui/Sensors/Sensor'
import { observedDomain, resolveDomain, resolveRamp } from '../../../../../../ui/Sensors/sensorColour'
import { SensorDetailDialog } from '../../../../../../ui/Sensors/SensorDetailDialog'
import { SensorInput } from '../../../../../../ui/Sensors/SensorInput'
import { valueColoursBySensor } from '../../../../../../ui/Sensors/sensorValueColours'
import { activeSensorTypeId, visibleSensors } from '../../../../../../ui/Sensors/sensorVisibility'
import { useSensorSeriesMulti } from '../../../../../../ui/Sensors/useSensorSeriesMulti'
import { extractCoordinatesFromFeature } from '../../../../utils/extractCoordinates'
import { MapLayerClickPriority } from '../../../../utils/MapEventManager/MapClickManager'
import { buildClusterEntry, clusterSpecFromFeature } from '../clusterPopupEntry'
import { CLUSTER_COUNT_COLOUR, createClusterLayer, createClusterCountLayer, createUnclusteredPointLayer } from '../mapLayersUtils'

import { SENSOR_CLUSTER_PROPERTIES, sensorClusterColour } from './sensorClusterColour'

const SENSOR_POINTS_LAYER_ID = 'sensors-unclustered-points'
const SENSOR_CLUSTER_LAYER_ID = 'sensors-clusters'

import type { SensorType} from '../../../../../../../types/dbTypes';
import type { PopupEntry } from '../../../../../../../types/map'
import type { MapGeoJSONFeature, MapLayerMouseEvent, MapMouseEvent } from 'maplibre-gl'

const SensorIconMarker = ({ feature, isHighlighted, isFocused, haloColour, onMouseEnter, onMouseLeave, sensorTypes }: { feature: MapGeoJSONFeature; isHighlighted?: boolean; isFocused?: boolean; haloColour?: string; onMouseEnter?: () => void; onMouseLeave?: () => void; sensorTypes: SensorType[] }) => {

  const coords = extractCoordinatesFromFeature(feature)
  if (!coords) return null

  const sensorType = sensorTypes.find(t => t.id === feature.properties?.typeId)
  const icon = sensorType?.icon || 'Radio'
  const SensorIcon = LR[icon] || LR.Radio

  // The border carries the sensor's current value when there is one, so selection moves to
  // border width and scale. Ring widths mirror the BIM marker's 2/3/4px tiers.
  const borderWidth = isFocused ? 4 : isHighlighted ? 3 : 2
  const borderColour = haloColour ?? (isHighlighted || isFocused ? HIGHLIGHT_COLOR : 'white')
  const glowColour = haloColour ? withAlpha(haloColour, 0.55) : 'rgba(115, 206, 226, 0.5)'
  const scale = isFocused ? 1.25 : isHighlighted ? 1.2 : 1

  return (
    <Marker key={String(feature.properties?.id ?? `${coords.lng},${coords.lat}`)} longitude={coords.lng} latitude={coords.lat} anchor="center" {...markerOcclusionProps}>
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: `${borderWidth}px solid ${borderColour}`,
          backgroundColor: 'black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: haloColour || isHighlighted || isFocused
            ? `0 0 ${isFocused ? 16 : 12}px ${glowColour}`
            : 'none',
          transition: 'all 0.2s ease-in-out',
          transform: `scale(${scale})`,
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <SensorIcon style={{ width: '20px', height: '20px', color: 'hsl(var(--primary-foreground))' }} />
      </div>
    </Marker>
  )
}

export const SensorLayers = () => {
    const [hoveredSensorId, setHoveredSensorId] = React.useState<number | null>(null)
  const clusterCountLayer = createClusterCountLayer('sensors')
  const unclusteredPointLayer = createUnclusteredPointLayer('sensors')

  // global map state

  const t = useTranslations('SensorLayers')
  const tSensors = useTranslations('SensorsSection')

  const { state: mapState, dispatch: mapDispatch } = React.useContext(MapContext)
  const { map, mapClickManager } = mapState.map
  const { sensors } = useSensors()
  const { users } = useUsers()
  const user = useSession().data?.user

  const sensorEntriesRef = React.useRef<Record<string, Partial<ISensor & { sensorType: SensorType }>>>({})
  const sensorBodyRef = React.useRef<(header: React.ReactNode) => React.ReactNode>(() => null)

  const closePopups = React.useCallback(
    () => mapDispatch({ type: 'SET_POPUP_STACK', payload: null }),
    [mapDispatch],
  )

  const popupInfo = React.useMemo(() => {
    const active = mapState.map.popupStack?.entries[mapState.map.popupStack.activeIndex]
    return active?.layerId === SENSOR_POINTS_LAYER_ID ? sensorEntriesRef.current[active.id] ?? null : null
  }, [mapState.map.popupStack])
  const { deleteSensor, updateSensor } = useSensor(popupInfo?.id ?? null)
  const { state: menusState, dispatch: menusDispatch } = React.useContext(MenusContext)
  const { visibleSensorTypes, visibleSensorTags, currentSensorId, focusedSensorId, sensorLegendTypeId } = menusState.menus
  const typesVisible = visibleSensorTypes?.[ViewerNames.map] || []
  const tagsVisible = visibleSensorTags?.[ViewerNames.map] || []

  const {sensorTypes} = useSensorTypes()

  const { state: appConfigState } = React.useContext(AppConfigContext)
  const timeZone = appConfigState.appConfig.displayTimeZone
  const [detailSensor, setDetailSensor] = React.useState<ISensor | null>(null)
  const [editSensor, setEditSensor] = React.useState<ISensor | null>(null)

  const eligibleSensors: Array<ISensor & { authorName: string } & { sensorType: SensorType }> = visibleSensors(sensors, {
    viewer: ViewerNames.map,
    visibleTypeIds: typesVisible,
    visibleTags: tagsVisible,
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
      closePopups()
    }
  }, [sensors, popupInfo, closePopups])

  // Every sensor sharing the active type gets a halo coloured by its own current value, readable
  // against the SensorLegend card. Only that one type is polled. Resolved through the same
  // helper the legend uses, so pinning a type in the legend dropdown moves the halos with it.
  const haloTypeId = activeSensorTypeId(eligibleSensors, {
    legendTypeId: sensorLegendTypeId?.[ViewerNames.map],
    activeSensorId: focusedSensorId,
  })
  const haloSensors = haloTypeId == null
    ? []
    : eligibleSensors.filter(s => s.typeId === haloTypeId)
  const { seriesById } = useSensorSeriesMulti(haloSensors, { enabled: haloSensors.length > 0 })

  const haloIdsKey = haloSensors.map(s => s.id).join(',')
  const readings = React.useMemo(
    () => valueColoursBySensor(haloSensors, sensorTypes, seriesById),
    [seriesById, sensorTypes, haloIdsKey],
  )

  // Cluster bubbles average the readings they hide, on the same ramp and domain the individual
  // halos use, so zooming out does not change what a colour means.
  const haloType = haloTypeId == null ? undefined : sensorTypes.find(t => t.id === haloTypeId)
  const haloRamp = haloType ? resolveRamp(haloType) : null
  const haloDomain = resolveDomain(
    haloType,
    observedDomain(haloSensors.flatMap(s => seriesById.get(s.id)?.points ?? [])),
  )
  const clusterLayer = createClusterLayer(
    'sensors',
    sensorClusterColour(haloRamp, haloDomain, CLUSTER_COUNT_COLOUR),
  )

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
              // Only present for sensors of the active type that are actually reporting. The
              // cluster accumulators count exactly these, so the average is over real readings.
              ...(readings.has(Number(id)) ? { value: readings.get(Number(id))?.value } : {}),
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
  }, [eligibleSensors, readings])

  // event listeners for sensor unclustered points
  React.useEffect(() => {
    if (!map) return
    const resolveSensors = (_e: MapMouseEvent, features: MapGeoJSONFeature[]): PopupEntry[] => {
      sensorEntriesRef.current = {}

      const entries = features.flatMap((feature) => {
        if (feature.properties.point_count) return []
        if (feature.geometry.type !== 'Point') return []
        const [longitude, latitude] = feature.geometry.coordinates
        const { id, authorId, name, typeId, data, dataFormat, updateFrequency, createdAt, url } = feature.properties

        const entryId = `${SENSOR_POINTS_LAYER_ID}:${id}`
        sensorEntriesRef.current[entryId] = {
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
        }

        return [{
          id: entryId,
          layerId: SENSOR_POINTS_LAYER_ID,
          priority: MapLayerClickPriority.CommentLayersClickPriority,
          title: (name as string) || t('sensorTitle'),
          coordinates: [longitude, latitude] as [number, number],
          // Readings and tags are live, so the body resolves at render time, not in this closure.
          render: (header) => sensorBodyRef.current(header),
        }]
      })

      // Focus on click so the legend and the sibling halos follow the sensor just opened.
      const first = entries[0]
      if (first) {
        menusDispatch({ type: 'SET_FOCUSED_SENSOR_ID', payload: { sensorId: sensorEntriesRef.current[first.id].id } })
      }

      return entries
    }

    const mouseEnterChangeCursor = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const mouseLeaveChangeCursor = () => {
      map.getCanvas().style.cursor = ''
    }

    // event listener for clicking on single point to show sensor, hover to change cursor
    mapClickManager.register(SENSOR_POINTS_LAYER_ID, MapLayerClickPriority.CommentLayersClickPriority, resolveSensors)

    map.on('mouseenter', 'sensors-unclustered-points', mouseEnterChangeCursor)
    map.on('mouseleave', 'sensors-unclustered-points', mouseLeaveChangeCursor)
    return () => {
      mapClickManager.unregister('sensors-unclustered-points')
      map.off('mouseenter', 'sensors-unclustered-points', mouseEnterChangeCursor)
      map.off('mouseleave', 'sensors-unclustered-points', mouseLeaveChangeCursor)
    }
  }, [map, mapClickManager, menusDispatch, t])

  const handleRemoveSensor = () => {
    toast.success(t('sensorDeleted'))
    void deleteSensor()
    closePopups()
  }

  // event listeners for clustered points
  React.useEffect(() => {
    if (!map) return

    const resolveCluster = (_e: MapMouseEvent, features: MapGeoJSONFeature[]): PopupEntry[] => {
      const feature = features[0]
      const spec = feature && clusterSpecFromFeature(feature)
      if (!spec) return []

      return [buildClusterEntry({
        map,
        sourceId: 'sensors',
        layerId: SENSOR_CLUSTER_LAYER_ID,
        title: t('sensorTitle'),
        priority: MapLayerClickPriority.CommentLayersClickPriority,
        leafLabel: (leaf) => String(leaf.properties?.name ?? ''),
        ...spec,
      })]
    }

    const mouseEnterChangeCursor = () => { map.getCanvas().style.cursor = 'pointer' }
    const mouseLeaveChangeCursor = () => { map.getCanvas().style.cursor = '' }

    // a cluster click contributes one entry listing its contents, hover to change cursor
    mapClickManager.register(SENSOR_CLUSTER_LAYER_ID, MapLayerClickPriority.CommentLayersClickPriority, resolveCluster)
    map.on('mouseenter', SENSOR_CLUSTER_LAYER_ID, mouseEnterChangeCursor)
    map.on('mouseleave', SENSOR_CLUSTER_LAYER_ID, mouseLeaveChangeCursor)
    return () => {
      mapClickManager.unregister(SENSOR_CLUSTER_LAYER_ID)
      map.off('mouseenter', SENSOR_CLUSTER_LAYER_ID, mouseEnterChangeCursor)
      map.off('mouseleave', SENSOR_CLUSTER_LAYER_ID, mouseLeaveChangeCursor)
    }
  }, [map, mapClickManager, t])

  const renderSensorBody = (header: React.ReactNode) => {
    if (!popupInfo) return null
    const sensorType = sensorTypes.find(t => t.id === popupInfo.typeId)
    const liveSensor = sensors.find(s => s.id === popupInfo.id)
    const dataUrl = popupInfo.url || popupInfo.data || ''

    return (
    <Sensor
      header={header}
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
      onClose={closePopups}
      onExpand={() => { if (liveSensor) setDetailSensor(liveSensor) }}
      onEdit={user.id === String(popupInfo.authorId) && liveSensor ? () => setEditSensor(liveSensor) : undefined}
      showActions
      focused={focusedSensorId === popupInfo.id}
      haloColour={popupInfo.id == null ? undefined : readings.get(popupInfo.id)?.colour}
      onSelect={() => {
        if (popupInfo.id != null) {
          menusDispatch({ type: 'SET_FOCUSED_SENSOR_ID', payload: { sensorId: popupInfo.id } })
        }
      }}
      timeZone={timeZone}
      size="sm"
    />
    )
  }
  sensorBodyRef.current = renderSensorBody

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
      {detailSensor && (
        <SensorDetailDialog
          open={!!detailSensor}
          onOpenChange={(o) => !o && setDetailSensor(null)}
          sensor={detailSensor}
          sensorType={sensorTypes.find(t => t.id === detailSensor.typeId)}
        />
      )}
      {editSensor && (
        <SensorInput
          viewer={ViewerNames.map}
          layout="dialog"
          isOpen={!!editSensor}
          editSensor={editSensor ?? undefined}
          onCancel={() => setEditSensor(null)}
          onSaved={() => setEditSensor(null)}
        />
      )}
  {(typesVisible.length > 0 || tagsVisible.length > 0) &&
    <Source
      id="sensors"
      type="geojson"
      data={geojsonSensorData}
      cluster={true}
      clusterMaxZoom={14}
      clusterRadius={40}
      clusterProperties={SENSOR_CLUSTER_PROPERTIES}
    >
      <Layer {...clusterLayer} />
      <Layer {...clusterCountLayer} />
      <Layer {...unclusteredPointLayer} />


      {unclusteredFeatures
        .filter((feature) => feature.properties?.id !== popupInfo?.id)
        .map((feature) => (
          <SensorIconMarker
            key={String(feature.properties?.id)}
            feature={feature}
            isHighlighted={currentSensorId === feature.properties?.id || hoveredSensorId === feature.properties?.id}
            isFocused={focusedSensorId === feature.properties?.id}
            haloColour={readings.get(Number(feature.properties?.id))?.colour}
            onMouseEnter={() => setHoveredSensorId(feature.properties?.id)}
            onMouseLeave={() => setHoveredSensorId(null)}
            sensorTypes={sensorTypes}
          />
        ))}
    </Source>}
    </>
  )
}
