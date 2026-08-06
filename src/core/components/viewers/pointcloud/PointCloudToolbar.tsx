'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { ToolbarBody } from '../../ToolbarBody'

import { usePointCloudToolbarTools } from './src/tools'

export function PointCloudToolbar() {
  return <ToolbarBody viewer="pointcloud" tools={usePointCloudToolbarTools()} />
}
