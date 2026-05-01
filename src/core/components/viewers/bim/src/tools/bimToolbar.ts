import { ClippingTool } from './ClippingTool/ClippingTool';

import { Tool } from '../../../../../types/tools'
import { useTranslations } from 'next-intl'
import * as LR from 'lucide-react'
import { MeasureBimTool } from './measureBimTool'
import { InspectBimTool } from './InspectBimTool'

import { ShareBimTool } from './shareBimTool'
import AddToBim from './AddToBim'
import { SelectionBimTool } from './selectionBimTool'
import { FitCameraTool } from './FitCameraTool'
import { ExplodeByLevelTool } from './ExplodeByLevelTool'

export type BimToolbarToolsType = 
'bim-add' | 
'bim-add-comment' | 'bim-add-file' | 'bim-add-ids' | 'bim-add-ifc' | 'bim-add-bcf' | 'bim-add-cad' | 'bim-add-sensor' | 'bim-add-h2k' | 
 'bim-clipping' |
 'bim-camera-fit' | 'bim-selection' | 'bim-camera' | 'bim-dimensions' | 'bim-inspect' | 'bim-share' | 'bim-explode'

export function bimToolbarTools(): Tool[] {
  // Translation
  const t = useTranslations('bimToolbarTools')

  return [
    // {
    //   id: 'bim-selection',
    //   title: t('selection'),
    //   icon: LR.MousePointerClick,
    //   component: SelectionBimTool,
    // },
    // {
      //   id: 'bim-explode',
      //   title: t('explode'),
    //   icon: LR.Layers3,
    //   component: ExplodeByLevelTool,
    // },
    {
      id: 'bim-clipping',
      title: t('clipping'),
      icon: LR.Crop,
      component: ClippingTool,
    },
    {
      id: 'bim-camera-fit',
      title: t('fit'),
      icon: LR.Maximize2,
      component: FitCameraTool,
    },
    {
      id: 'bim-add',
      title: t('add'),
      icon: LR.Plus,
      component: AddToBim,
    },
    {
      id: 'bim-dimensions',
      title: t('measure'),
      icon: LR.Ruler,
      component: MeasureBimTool,
    },
    {
      id: 'bim-share',
      title: t('share'),
      icon: LR.Share2,
      component: ShareBimTool
    },
    // Add more tools here if needed
  ]
}
