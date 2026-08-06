// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'

import { usePluginToolbarTools } from '../../../../../plugins/host/usePluginToolbarTools'
import { usePointCloudViewer } from '../../../../../plugins/sdk/pointCloudViewer'
import { GenericTool } from '../../../../ui/GenericTool'

import { ClippingTool } from './ClippingTools/ClippingTool'
import FitToScreen from './FitToScreen'
import { MeasurePointCloudTool } from './MeasureTools/MeasurePointCloudTool'
import { PerformanceSettingTools } from './PerformanceSettingsTools/PerformanceSettingTools'
import SetCameraOption from './SetCameraOption'
import { SharePointCloudTool } from './SharePointCloudTool'


import type { Tool } from '../../../../../types/tools'

export type PointCloudToolType = 'pc-clip-tool' | 'pc-fit-to-screen-tool' | 'pc-add-tool' | 'pc-dimensions-tool' | 'pc-set-camera-option' | 'pc-share-tool'

export function pointcloudToolbarTools(): Tool[] {
  // Translation
  const t = useTranslations('pointcloudToolbarTools')

  const viewer = usePointCloudViewer()
  const pluginTools = usePluginToolbarTools('pointcloud.tools', { viewer })

  return [
    { id: 'pc-clip-tool', title: t('clipTitle'), icon: LR.Crop, component: ClippingTool,disabled: true },
    { id: 'pc-fit-to-screen-tool', title: "Fit to screen", icon: LR.Fullscreen, component: FitToScreen },
    // { id: 'pc-add-tool', title: t('addTitle'), icon: LR.Plus, component: GenericTool, disabled: true },
    { id: 'pc-dimensions-tool', title: t('dimensionsTitle'), icon: LR.Ruler, component: MeasurePointCloudTool },
    { id: 'pc-set-camera-option', title: "Camera Options", icon: LR.Video, component: SetCameraOption },
    { id: 'pc-share-tool', title: t('shareTitle'), icon: LR.Share2, component: SharePointCloudTool, disabled: true },
    // Plugin-contributed tools come last, after everything core ships.
    ...pluginTools,
  ]
}