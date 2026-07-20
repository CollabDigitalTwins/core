// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { CursorType } from './global'
import type { BimToolbarToolsType } from '../components/viewers/bim/src/tools/bimToolbar'
import type { MapToolbarToolType } from '../components/viewers/map/src/tools/mapTools'
import type { PointCloudToolType } from '../components/viewers/pointcloud/src/tools/pointcloudToolbarTools'
import type { Building } from '../types/dbTypes'
import type { LucideProps } from 'lucide-react'

export type ToolbarToolType = BimToolbarToolsType | MapToolbarToolType | PointCloudToolType | 'settings' | 'file-manager' | null
export interface Tool {
  id: ToolbarToolType
  title: string
  url?: string
  icon: React.ComponentType<LucideProps>
  cursor?: CursorType
  stayActive?: boolean
  disabled?: boolean
  children?: Tool[]
  width?: string
  height?: string
  component?: React.ComponentType<{ tool: Tool, building?: Building } & Record<string, unknown>>
  extraProps?: Record<string, unknown>
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  measure?: () => {
    enable: () => void
    disable: () => void
    reset: () => void
  }
}
