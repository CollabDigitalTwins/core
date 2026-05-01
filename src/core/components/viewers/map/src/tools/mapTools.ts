import { useTranslations } from 'next-intl'

// Utilities
import { Tool } from '../../../../../types/tools'

// Icons
import * as LR from 'lucide-react'

// Custom toolbar buttons
import { MeasureMapTool } from './measureMapTool'

import AddToMap from './AddTools/AddToMap'
import { ShareMapTool } from './shareMapTool'
import DatasetMapTool from './DatasetMapTool'
import Compare from '../compare'

export type MapToolbarToolType = 
'map-dimensions' | 
'map-media' | 
'map-compare' | 
'map-database' | 
'map-add' | 
'map-add-comment' |
'map-add-dataset' |
'map-add-site' |
'map-add-building' |
'map-add-sensor' |
'map-add-file' |
'map-measure' | 
'map-share' |
'map-compare-buildings' |
'open-building-page' |
'open-bim-viewer' |
'open-pointcloud'

// Export toolbar configuration
export function mapToolbarTools(): Tool[] {
  // Translation
  const t = useTranslations('mapToolbarTools')

  return [
    { id: 'map-compare', title: t('compareTitle'), url: '/', icon: LR.Columns3, component: Compare },
    { id: 'map-database', title: t('datasetsTitle'), url: '/', icon: LR.Database, component: DatasetMapTool },
    {
      id: 'map-add',
      title: t('addTitle'),
      icon: LR.Plus,
      component: AddToMap,
    },
    {
      id: 'map-measure',
      title: t('measureTitle'),
      icon: LR.Ruler,
      cursor: 'crosshair',
      stayActive: true,
      component: MeasureMapTool,
    },
    { id: 'map-share',
      title: t('shareTitle'),
      icon: LR.Share2,
      component: ShareMapTool,
    },
  ]
}
