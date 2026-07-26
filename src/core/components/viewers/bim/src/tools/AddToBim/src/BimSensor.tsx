'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";

import Sensor from '../../../../../../ui/Sensors/Sensor'

import { markerStyle } from './markerUtils'

import type { SensorDataFormat, SensorType } from '../../../../../../../types/dbTypes';
import type { CommentActionLabels } from '../../../../../../ui/Comments/CommentActionButtons';
import type * as THREE from 'three'

interface SensorProps {
  sensorName: string
  sensorType: SensorType
  dataUrl: string
  dataFormat: SensorDataFormat
  updateFrequency: number
  tags?: string[]
  worldCamera: THREE.Camera
  targetPoint: THREE.Vector3
  onRemove?: () => void
  onEdit?: () => void
  onExpand?: () => void
  /** Pressed the marker: focuses the sensor so the legend and halos follow it. */
  onSelect?: () => void
  onClose: () => void
  buildingId?: number
  timestamp: Date
  sphere: THREE.Object3D
  highlight?: boolean
  /** Click-focused sensor. Widens the ring, since colour is spent on the value. */
  focused?: boolean
  /** Colour for the current value, from `colourForValue`. Absent when the type has no ramp. */
  haloColour?: string
  timeZone?: string
  showActions?: boolean
  canEdit?: boolean
  canDelete?: boolean
  actionLabels?: CommentActionLabels
}

export default function BimSensor({
  sensorName,
  sensorType,
  tags,
  dataUrl,
  dataFormat,
  updateFrequency,
  onRemove,
  onEdit,
  onExpand,
  onSelect,
  onClose,
  buildingId,
  timestamp,
  highlight = false,
  focused = false,
  haloColour,
  timeZone,
  showActions = false,
  canEdit = true,
  canDelete = true,
  actionLabels,
}: SensorProps): React.ReactElement {
  return (
    <div className={markerStyle}>
      <Sensor
        buildingId={buildingId}
        sensorName={sensorName}
        sensorType={sensorType}
        tags={tags}
        tagsVariant="read-only"
        dataUrl={dataUrl}
        dataFormat={dataFormat}
        updateFrequency={updateFrequency}
        createdAt={timestamp}
        onRemove={onRemove}
        onEdit={onEdit}
        onExpand={onExpand}
        onSelect={onSelect}
        onClose={onClose}
        showActions={showActions}
        canEdit={canEdit}
        canDelete={canDelete}
        actionLabels={actionLabels}
        enableCollapse
        defaultCollapsed
        size="sm"
        highlight={highlight}
        focused={focused}
        haloColour={haloColour}
        timeZone={timeZone}
      />
    </div>
  )
}
