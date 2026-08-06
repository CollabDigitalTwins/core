// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { usePluginToolbarTools } from '../../../../../plugins/host/usePluginToolbarTools'
import { useMapViewer } from '../../../../../plugins/sdk/mapViewer'
// Utilities
import Compare from '../compare'

import AddToMap from './AddTools/AddToMap'
import DatasetMapTool from './DatasetMapTool'
import { MeasureMapTool } from './measureMapTool'
import { ShareMapTool } from './shareMapTool'

import type { Organization } from '../../../../../types/dbTypes'
import type { Tool } from '../../../../../types/tools'

// Icons

// Custom toolbar buttons


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

type MapToolsConfig = {
  martinBaseUrl?: string
  minioBaseUrl?: string
  organization?: Organization
  geocodeEarthApiKey?: string
  geocoderUrl?: string
}

// Export toolbar configuration
export function useMapToolbarTools(config?: MapToolsConfig): Tool[] {
  // Translation
  const t = useTranslations('mapToolbarTools')

  const extraProps = (config ?? {}) as unknown as Record<string, unknown>

  // Map plugin tools get the MapLibre handle as `MapToolProps`, alongside the
  // same config core tools receive. Imported from `sdk/mapViewer`, not the
  // `sdk/viewer` barrel, so the BIM engine stays out of this eager bundle.
  // Memoized: a fresh object every render would recompute the tool list each time.
  const viewer = useMapViewer()
  const pluginProps = React.useMemo(
    () => ({ ...extraProps, ...viewer }),
    [extraProps, viewer],
  )
  const pluginTools = usePluginToolbarTools('map.tools', pluginProps)

  return [
    { id: 'map-compare', title: t('compareTitle'), url: '/', icon: LR.Columns3, component: Compare },
    { id: 'map-database', title: t('datasetsTitle'), url: '/', icon: LR.Database, component: DatasetMapTool, extraProps },
    {
      id: 'map-add',
      title: t('addTitle'),
      icon: LR.Plus,
      component: AddToMap,
      extraProps,
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
    // Plugin-contributed tools come last, after everything core ships.
    ...pluginTools,
  ]
}

/** @deprecated Renamed to useMapToolbarTools; it is a hook and must be called during render. */
export const mapToolbarTools = useMapToolbarTools
