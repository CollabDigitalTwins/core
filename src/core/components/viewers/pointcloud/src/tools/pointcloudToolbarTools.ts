import { Tool } from '../../../../../types/tools'
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'

import { MeasurePointCloudTool } from './MeasureTools/MeasurePointCloudTool'
import { ClippingTool } from './ClippingTools/ClippingTool'
import { SharePointCloudTool } from './SharePointCloudTool'
import FitToScreen from './FitToScreen'
import SetCameraOption from './SetCameraOption'
import { PerformanceSettingTools } from './PerformanceSettingsTools/PerformanceSettingTools'
import { GenericTool } from '../../../../ui/GenericTool'

export type PointCloudToolType = 'pc-clip-tool' | 'pc-fit-to-screen-tool' | 'pc-add-tool' | 'pc-dimensions-tool' | 'pc-set-camera-option' | 'pc-share-tool'

export function pointcloudToolbarTools(): Tool[] {
  // Translation
  const t = useTranslations('pointcloudToolbarTools')

  return [
    { id: 'pc-clip-tool', title: t('clipTitle'), icon: LR.Crop, component: ClippingTool,disabled: true },
    { id: 'pc-fit-to-screen-tool', title: "Fit to screen", icon: LR.Fullscreen, component: FitToScreen },
    // { id: 'pc-add-tool', title: t('addTitle'), icon: LR.Plus, component: GenericTool, disabled: true },
    { id: 'pc-dimensions-tool', title: t('dimensionsTitle'), icon: LR.Ruler, component: MeasurePointCloudTool },
    { id: 'pc-set-camera-option', title: "Camera Options", icon: LR.Video, component: SetCameraOption },
    { id: 'pc-share-tool', title: t('shareTitle'), icon: LR.Share2, component: SharePointCloudTool, disabled: true },
  ]
}