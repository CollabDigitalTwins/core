"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import * as React from "react"

import { useCoreHooks } from "../../../../../../../hooks/provider"
import { useSensors, useSensor } from "../../../../../../../hooks/sensors/sensors"
import { useSensorTypes } from "../../../../../../../hooks/sensorTypes/sensorTypes"
import { useUsers } from "../../../../../../../hooks/users/users"
import { AppConfigContext, MenusContext } from "../../../../../../../store"
import { ViewerNames, type Sensor } from "../../../../../../../types/dbTypes"
import { readingsKey, valueColoursBySensor } from "../../../../../../ui/Sensors/sensorValueColours"
import { activeSensorTypeId, visibleSensors } from "../../../../../../ui/Sensors/sensorVisibility"
import { useSensorSeriesMulti } from "../../../../../../ui/Sensors/useSensorSeriesMulti"

import BimSensor from "./BimSensor"
import { clearCSS2DMarkers, renderCSS2DMarkers, type MarkerRef } from "./renderCSS2DMarkers"

export function useSensorMarkers(world: any, buildingId: number) {
  const { state: menusState, dispatch: menusDispatch } = React.useContext(MenusContext)
  const { currentSensorId, focusedSensorId, visibleSensorTypes, visibleSensorTags, sensorLegendTypeId } = menusState.menus
  const { state: appConfigState } = React.useContext(AppConfigContext)
  const timeZone = appConfigState.appConfig.displayTimeZone
  const sessionUser = useSession().data?.user
  const tr = useTranslations('SensorsSection')
  const actionLabels = { expand: tr('expandSensor'), edit: tr('editSensor'), delete: tr('deleteSensor') }
  const [detailSensor, setDetailSensor] = React.useState<Sensor | null>(null)
  const [editSensor, setEditSensor] = React.useState<Sensor | null>(null)

  const registry = React.useRef<Map<string, MarkerRef>>(new Map())

  const { sensors } = useSensors()
  const { users } = useUsers()
  const { sensorTypes } = useSensorTypes()
  const coreHooks = useCoreHooks()

  const [sensorToDelete, setSensorToDelete] = React.useState<number | null>(null)
  const { deleteSensor } = useSensor(sensorToDelete)

  const eligibleSensors = sensors
    .filter((sensor) => {
      const { x, y, z, viewer } = sensor
      if (x == null || y == null || z == null) return false
      if (viewer !== ViewerNames.bim) return false
      if (buildingId !== -1 && sensor.buildingId !== buildingId) return false
      return true
    })
    .map((sensor) => {
      const user = users.find(u => u.id === sensor.authorId)
      const sensorType = sensorTypes.find(t => t.id === sensor.typeId)
      return {
        ...sensor,
        authorName: user?.name ?? "Unknown User",
        imageFileId: user?.imageFileId ?? "images/default-avatar.svg",
        sensorType,
      }
    })

  // Stable ref so the render effect reads current sensors without re-running on every change
  const eligibleSensorsRef = React.useRef(eligibleSensors)
  eligibleSensorsRef.current = eligibleSensors

  // Every sensor sharing the active type gets a halo coloured by its own current value, so the
  // whole set can be read against the legend at a glance. Only that type is polled: haloing all
  // types would fan out a request per sensor in the building. The type comes from the same
  // helper the legend uses, so a type pinned in the legend dropdown moves the halos with it.
  const haloTypeId = activeSensorTypeId(eligibleSensors, {
    legendTypeId: sensorLegendTypeId?.[ViewerNames.bim],
    activeSensorId: focusedSensorId,
  })

  const haloSensors = haloTypeId == null
    ? []
    : eligibleSensors.filter(s => s.typeId === haloTypeId)
  // A fresh array each render is fine: the hook keys on the sensors' id+url string.
  const { seriesById } = useSensorSeriesMulti(haloSensors, { enabled: haloSensors.length > 0 })

  const haloIdsKey = haloSensors.map(s => s.id).join(',')
  const readings = React.useMemo(
    () => valueColoursBySensor(haloSensors, sensorTypes, seriesById),
    [seriesById, sensorTypes, haloIdsKey],
  )

  // Colour strings, not map identity, decide whether markers need re-rendering: a poll that
  // returns the same reading must not re-render every marker.
  const haloKey = readingsKey(readings)
  const readingsRef = React.useRef(readings)
  readingsRef.current = readings

  const focusSensor = React.useCallback((sensorId: number) => {
    menusDispatch({ type: 'SET_FOCUSED_SENSOR_ID', payload: { sensorId } })
  }, [menusDispatch])

  React.useEffect(() => {
    if (sensorToDelete !== null) {
      void deleteSensor()
      setSensorToDelete(null)
    }
  }, [sensorToDelete, deleteSensor])

  const handleRemoveSensor = React.useCallback((sensorId: number) => {
    setSensorToDelete(sensorId)
  }, [])

  // Pending markers for loading indicators while sensor is being created
  const [pendingSensors, setPendingSensors] = React.useState<Array<{ id: number; x: number; y: number; z: number }>>([])

  const addPendingSensor = React.useCallback((position: { x: number; y: number; z: number }) => {
    const id = -Date.now()
    setPendingSensors(prev => [...prev, { id, ...position }])
    return id
  }, [])

  const removePendingSensor = React.useCallback((id: number) => {
    setPendingSensors(prev => prev.filter(p => p.id !== id))
  }, [])

  // Render sensor markers with visibility filtering
  React.useEffect(() => {
    const typesVisible = visibleSensorTypes?.[ViewerNames.bim] || []
    const tagsVisible = visibleSensorTags?.[ViewerNames.bim] || []

    const markerSensors = visibleSensors(eligibleSensorsRef.current, {
      viewer: ViewerNames.bim,
      visibleTypeIds: typesVisible,
      visibleTags: tagsVisible,
    })

    const allSensors = [
      ...markerSensors.map(s => ({ ...s, isPending: false })),
      ...pendingSensors.map(p => ({
        id: p.id,
        name: "Creating...",
        sensorType: undefined,
        typeId: undefined,
        x: p.x,
        y: p.y,
        z: p.z,
        url: "",
        dataFormat: "Json",
        updateFrequency: 0,
        createdAt: new Date().toISOString(),
        buildingId,
        tags: [],
        authorId: -1,
        isPending: true,
      })),
    ]

    renderCSS2DMarkers(world, {
      items: allSensors,
      markerIdKey: "sensorId",
      registry,
      component: BimSensor,
      hooksContextValue: coreHooks,
      propsMapper: (sensor) => ({
        sensorName: sensor.name,
        sensorType: sensorTypes.find(t => t.id === sensor.typeId),
        tags: sensor.tags,
        dataUrl: sensor.url ?? "",
        dataFormat: sensor.dataFormat,
        updateFrequency: sensor.updateFrequency,
        buildingId: sensor.buildingId,
        timestamp: new Date(sensor.createdAt),
        highlight: currentSensorId === sensor.id,
        focused: focusedSensorId === sensor.id,
        haloColour: readingsRef.current.get(sensor.id)?.colour,
        timeZone,
        showActions: true,
        onSelect: () => focusSensor(sensor.id),
        onExpand: () => setDetailSensor(sensor as unknown as Sensor),
        onEdit: () => setEditSensor(sensor as unknown as Sensor),
        actionLabels,
        canEdit: sessionUser?.id === String(sensor.authorId),
        canDelete: sessionUser?.id === String(sensor.authorId),
      }),
      sphereColor: "#10b981",
      isVisible: true,
      onRemove: handleRemoveSensor,
    })
  }, [world, sensors, pendingSensors, handleRemoveSensor, visibleSensorTypes, visibleSensorTags, buildingId, currentSensorId, focusedSensorId, haloKey, focusSensor, sensorTypes, coreHooks, timeZone, sessionUser?.id])

  // Separate from the render effect above so it runs only on unmount, not on every re-render.
  // Without it each sensor's marker left a THREE mesh in the scene and, worse, a mounted React
  // root behind, both surviving the world that owned them.
  React.useEffect(() => () => { clearCSS2DMarkers(world, registry) }, [world])

  const sensorCount = sensors.filter(
    s => s.viewer === ViewerNames.bim && (!buildingId || buildingId === -1 || s.buildingId === buildingId)
  ).length

  const detailSensorType = detailSensor ? sensorTypes.find(t => t.id === detailSensor.typeId) : undefined

  return {
    addPendingSensor,
    removePendingSensor,
    sensorCount,
    detailSensor,
    detailSensorType,
    closeSensorDetail: () => setDetailSensor(null),
    editSensor,
    closeSensorEdit: () => setEditSensor(null),
  }
}
