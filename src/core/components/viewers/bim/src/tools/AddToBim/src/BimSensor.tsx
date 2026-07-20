'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import type * as THREE from 'three'
import Sensor from '../../../../../../ui/Sensors/Sensor'
import type { SensorDataFormat, SensorType } from '../../../../../../../types/dbTypes';
import { markerStyle, markerStyleHighlight } from './markerUtils'

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
  onClose: () => void
  buildingId?: number
  timestamp: Date
  sphere: THREE.Object3D
  highlight?: boolean
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
  onClose,
  buildingId,
  timestamp,
  sphere,
  highlight = false,
}: SensorProps): React.ReactElement {
  return (
    <div
      className={highlight ? markerStyleHighlight : markerStyle}
    >
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
        onClose={onClose}
        enableCollapse
        defaultCollapsed
        size="sm"
        highlight={highlight}
      />
    </div>
  )
}