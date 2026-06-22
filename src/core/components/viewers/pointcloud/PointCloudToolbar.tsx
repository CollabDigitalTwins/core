'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { pointcloudToolbarTools } from './src/tools'
import { ToolbarBody } from '../../ToolbarBody'

export function PointCloudToolbar() {
  return <ToolbarBody viewer="pointcloud" tools={pointcloudToolbarTools()} />
}
