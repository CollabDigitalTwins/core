'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";

import Sensor from '../../../../../../ui/Sensors/Sensor'

import { markerStyle, markerStyleHighlight } from './markerUtils'

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
  onClose: () => void
  buildingId?: number
  timestamp: Date
  sphere: THREE.Object3D
  highlight?: boolean
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
  onClose,
  buildingId,
  timestamp,
  highlight = false,
  timeZone,
  showActions = false,
  canEdit = true,
  canDelete = true,
  actionLabels,
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
        onEdit={onEdit}
        onExpand={onExpand}
        onClose={onClose}
        showActions={showActions}
        canEdit={canEdit}
        canDelete={canDelete}
        actionLabels={actionLabels}
        enableCollapse
        defaultCollapsed
        size="sm"
        highlight={highlight}
        timeZone={timeZone}
      />
    </div>
  )
}
