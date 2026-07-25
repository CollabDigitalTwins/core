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
import { UNTAGGED_TAG } from "../../../../../../ui/Sensors/SensorsSection"

import BimSensor from "./BimSensor"
import { renderCSS2DMarkers, type MarkerRef } from "./renderCSS2DMarkers"

export function useSensorMarkers(world: any, buildingId: number) {
  const { state: menusState } = React.useContext(MenusContext)
  const { currentSensorId, visibleSensorTypes, visibleSensorTags } = menusState.menus
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

  React.useEffect(() => {
    if (sensorToDelete !== null) {
      deleteSensor()
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

    const visibleSensors = eligibleSensorsRef.current.filter(sensor => {
      const matchesType = typesVisible.includes(sensor.typeId)
      const hasNoTags = !sensor.tags?.length
      const matchesTag = hasNoTags
        ? tagsVisible.includes(UNTAGGED_TAG)
        : sensor.tags?.some((tag: string) => tagsVisible.includes(tag)) ?? false
      return matchesType || matchesTag
    })

    const allSensors = [
      ...visibleSensors.map(s => ({ ...s, isPending: false })),
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
        timeZone,
        showActions: true,
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
  }, [world, sensors, pendingSensors, handleRemoveSensor, visibleSensorTypes, visibleSensorTags, buildingId, currentSensorId, sensorTypes, coreHooks, timeZone, sessionUser?.id])

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
