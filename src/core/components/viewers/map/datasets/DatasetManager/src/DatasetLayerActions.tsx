'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { DatasetsContext, MapContext } from '../../../../../../store'
import { Button } from '../../../../../ui/Button'
import { canZoomToDataset, zoomToDataset } from '../../src/datasetExtent'

import type { Dataset } from '../../../../../../types/datasetTypes'

interface DatasetLayerActionsProps {
  dataset: Dataset
  styleOpen?: boolean
  onToggleStyle?: (datasetName: string) => void
}

export function DatasetLayerActions({ dataset, styleOpen = false, onToggleStyle }: DatasetLayerActionsProps) {
  const t = useTranslations('DatasetManagerMenu')
  const { dispatch: datasetDispatch } = React.useContext(DatasetsContext)
  const { state: mapState } = React.useContext(MapContext)
  const map = mapState.map.map

  const visible = dataset.visible !== false
  const visibilityLabel = t(visible ? 'hide' : 'show')
  const styleLabel = t(styleOpen ? 'closeStyle' : 'style')

  const toggleVisibility = () => {
    datasetDispatch({ type: 'TOGGLE_DATASET_VISIBILITY', payload: { datasetId: dataset.id } })
  }
  const deactivate = () => {
    datasetDispatch({ type: 'REMOVE_DATASET_FROM_MAP', payload: { datasetId: dataset.id } })
  }
  const zoom = () => {
    if (map) void zoomToDataset(map, dataset)
  }

  return (
    <div className="flex shrink-0 items-center">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleVisibility} aria-label={visibilityLabel} title={visibilityLabel}>
        {visible ? <LR.Eye className="h-4 w-4" aria-hidden /> : <LR.EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden />}
      </Button>
      {map && canZoomToDataset(dataset) && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoom} aria-label={t('zoomToExtent')} title={t('zoomToExtent')}>
          <LR.Scan className="h-4 w-4" aria-hidden />
        </Button>
      )}
      {onToggleStyle && (
        <Button
          variant={styleOpen ? 'secondary' : 'ghost'}
          size="icon"
          className="h-7 w-7"
          aria-expanded={styleOpen}
          aria-label={styleLabel}
          title={styleLabel}
          onClick={() => onToggleStyle(dataset.name)}
        >
          <LR.ChevronDown className={`h-4 w-4 transition-transform duration-200 ${styleOpen ? 'rotate-180' : ''}`} aria-hidden />
        </Button>
      )}
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={deactivate} aria-label={t('deactivate')} title={t('deactivate')}>
        <LR.X className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  )
}
