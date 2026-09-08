// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins


import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'


import { usePluginToolbarTools } from '../../../../../plugins/host/usePluginToolbarTools'
import { useBimViewer } from '../../../../../plugins/sdk/bimViewer'

import AddToBim from './AddToBim'
import { ClippingTool } from './ClippingTool/ClippingTool';
import { ExplodeByLevelTool } from './ExplodeByLevelTool'
import { FitCameraTool } from './FitCameraTool'
import { InspectBimTool } from './InspectBimTool'
import { MeasureBimTool } from './measureBimTool'
import { SelectionBimTool } from './selectionBimTool'
import { ShareBimTool } from './shareBimTool'

import type { Tool } from '../../../../../types/tools'

export type BimToolbarToolsType =
  'bim-add' |
  'bim-add-comment' | 'bim-add-file' | 'bim-add-ids' | 'bim-add-ifc' | 'bim-add-bcf' | 'bim-add-cad' | 'bim-add-sensor' | 'bim-add-h2k' |
  'bim-clipping' |
  'bim-camera-fit' | 'bim-selection' | 'bim-camera' | 'bim-dimensions' | 'bim-inspect' | 'bim-share' | 'bim-explode'

/** BIM toolbar tool definitions. A hook because it calls useTranslations, so it has to
 *  run during a render. */
export function useBimToolbarTools(): Tool[] {
  // Translation
  const t = useTranslations('bimToolbarTools')

  // Read here, not in the shared toolbar host, to keep `@thatopen` out of the map route's bundle.
  const viewer = useBimViewer()
  const pluginTools = usePluginToolbarTools('bim.tools', viewer as unknown as Record<string, unknown>)

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
    // Plugin-contributed tools come last, after everything core ships.
    ...pluginTools,
  ]
}

/** @deprecated Renamed to useBimToolbarTools; it is a hook and must be called during render. */
export const bimToolbarTools = useBimToolbarTools
