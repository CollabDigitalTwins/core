'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useComments, useDeleteComments } from '../../../hooks/comments/comments'
import { useSensor, useSensors } from '../../../hooks/sensors/sensors'
import { useSensorTypes } from '../../../hooks/sensorTypes/sensorTypes'
import { useMenusContext, useToolsContext } from '../../../store'
import { UNTAGGED_TAG } from '../../ui/Sensors/sensorVisibility'
import { useLatest } from '../useTourLayout'

import type { PlacedItemPort, SensorPort } from './placeDemo'
import type { Sensor } from '../../../types/dbTypes'
import type { ToolbarToolType } from '../../../types/tools'

type DialogControls = Pick<PlacedItemPort, 'openDialog' | 'closeDialog'>

function useToolDialog(tool: ToolbarToolType): DialogControls {
  const { state, dispatch } = useToolsContext()
  const current = useLatest(state.tools.currentToolId)
  return React.useMemo(() => ({
    openDialog: () => dispatch({ type: 'SET-TOOL', payload: { currentToolId: tool } }),
    closeDialog: () => { if (current.current === tool) dispatch({ type: 'CLEAR-TOOLS' }) },
  }), [current, dispatch, tool])
}

/** The map's comments as a port the comment demo acts through; removing one also removes its replies. */
export function useCommentPort(placeAtCentre: () => void): PlacedItemPort {
  const { comments } = useComments()
  const latest = useLatest(comments)
  const { deleteComments } = useDeleteComments()
  const dialog = useToolDialog('map-add-comment')
  return React.useMemo(() => ({
    ...dialog,
    placeAtCentre,
    items: () => latest.current.map(comment => ({ id: comment.id, label: comment.text ?? '' })),
    remove: id => {
      const replies = latest.current.filter(comment => comment.replyToId === id).map(comment => comment.id)
      deleteComments({ ids: [id, ...replies] }).catch(() => {})
    },
  }), [dialog, placeAtCentre, latest, deleteComments])
}

function useSensorRemover(): (id: number) => void {
  const [queue, setQueue] = React.useState<number[]>([])
  const head = queue[0] ?? null
  const { deleteSensor } = useSensor(head)
  React.useEffect(() => {
    if (head === null) return
    deleteSensor().catch(() => {})
    setQueue(rest => rest.slice(1))
  }, [head, deleteSensor])
  return React.useCallback((id: number) => setQueue(rest => [...rest, id]), [])
}

const sensorGroups = (sensor: Sensor) => [
  `sensor-type:${sensor.typeId ?? -1}`,
  ...(sensor.tags?.length ? sensor.tags : [UNTAGGED_TAG]).map(tag => `sensor-tag:${tag}`),
]

/** The sensors and sensor types as a port the sensor demo acts through. */
export function useSensorPort(placeAtCentre: () => void): SensorPort {
  const latest = useLatest(useSensors().sensors)
  const types = useLatest(useSensorTypes().sensorTypes)
  const { dispatch } = useMenusContext()
  const remove = useSensorRemover()
  const dialog = useToolDialog('map-add-sensor')
  return React.useMemo(() => ({
    ...dialog,
    placeAtCentre,
    remove,
    items: () => latest.current.map(sensor => ({ id: sensor.id, label: sensor.name, groups: sensorGroups(sensor) })),
    typeIds: () => types.current.map(type => type.id),
    preselectType: id => dispatch({ type: 'SET_CURRENT_SENSOR_TYPE_ID', payload: { currentSensorTypeId: id } }),
  }), [dialog, placeAtCentre, remove, latest, types, dispatch])
}
