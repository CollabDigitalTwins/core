'use client'

import * as React from 'react'
import { pointcloudToolbarTools } from './src/tools'
import { ToolbarBody } from '../../ToolbarBody'

export function PointCloudToolbar() {
  return <ToolbarBody viewer="pointcloud" tools={pointcloudToolbarTools()} />
}
