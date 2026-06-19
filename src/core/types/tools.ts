// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { BimToolbarToolsType } from '../components/viewers/bim/src/tools/bimToolbar'
import type { MapToolbarToolType } from '../components/viewers/map/src/tools/mapTools'
import { PointCloudToolType } from '../components/viewers/pointcloud/src/tools/pointcloudToolbarTools'

import { CursorType } from './global'
import { LucideProps } from 'lucide-react'
import type { Building } from '../types/dbTypes'

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
  component?: React.ComponentType<{ tool: Tool, building?: Building }>
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  measure?: () => {
    enable: () => void
    disable: () => void
    reset: () => void
  }
}
