'use client'

import * as React from 'react'
import { pointcloudToolbarTools } from './src/tools'
import { ToolbarBody } from '../../ToolbarBody'

// Audit Phase 1.A (F-1e): mirror of BimToolbar.tsx for the PointCloud
// viewer. Lives in the PointCloud folder so the Toolbar.tsx dispatcher's
// dynamic import keeps the Potree-adjacent tool registry on the
// PointCloud lazy chunk.
export function PointCloudToolbar() {
  return <ToolbarBody viewer="pointcloud" tools={pointcloudToolbarTools()} />
}
