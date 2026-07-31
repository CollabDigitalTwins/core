'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { BimContext } from '../../../../../../../../store'
import { Button } from '../../../../../../../ui/Button'
import { useBimTreeControls } from '../../../../lib/useBimTreeControls'
import { SpatialStructure } from '../../../../SpatialStructure'

import { BimTreeView } from './BimTreeView'
import { LayerViewPanel } from './LayerViewPanel'

import type { BimTreeNode } from '../../../../lib/bimTree'

interface Props {
  /** Filter query from the shared search bar at the top of the LayersTab. */
  searchQuery: string
}

/**
 * Sidebar section for the IFC spatial structure (Building > Storey > Space >
 * Element) of every loaded model, with select / hide / isolate per node.
 *
 * The tree itself is built by the `SpatialStructure` component and rendered by
 * the shared `BimTreeView`; this file only wires the two together.
 */
export function SpatialStructureSection({ searchQuery }: Props) {
  const t = useTranslations('LayersTab')
  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents } = bimState.bim

  const [trees, setTrees] = React.useState<BimTreeNode[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (!bimComponents) return

    const spatialStructure = bimComponents.get(SpatialStructure)

    setTrees(spatialStructure.trees)
    setIsLoading(spatialStructure.isLoading)

    const onTrees = (data: { trees: BimTreeNode[] }) => setTrees(data.trees)
    const onLoading = (data: { isLoading: boolean }) => setIsLoading(data.isLoading)

    spatialStructure.onSpatialStructureCreated.add(onTrees)
    spatialStructure.onLoadingStateChanged.add(onLoading)

    // Build a tree for every model that does not have one yet. `LoadModels`
    // already kicks this off per model, but the sidebar can mount after a model
    // has finished loading (or be re-opened later), so ask for anything missing.
    try {
      const fragments = bimComponents.get(OBC.FragmentsManager)
      for (const modelId of fragments.list.keys()) {
        if (!spatialStructure.hasTree(modelId)) {
          void spatialStructure.getSpatialStructure(modelId)
        }
      }
    } catch {
      // FragmentsManager not initialised yet; the events above will deliver the
      // trees once models load.
    }

    return () => {
      spatialStructure.onSpatialStructureCreated.remove(onTrees)
      spatialStructure.onLoadingStateChanged.remove(onLoading)
    }
  }, [bimComponents])

  const controls = useBimTreeControls({
    components: bimComponents,
    nodes: trees,
    searchQuery,
  })

  let body: React.ReactNode
  if (isLoading && trees.length === 0) {
    body = (
      <div className="flex items-center justify-center py-8">
        <LR.Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">{t('loadingText')}</span>
      </div>
    )
  } else if (trees.length === 0) {
    body = (
      <div className="flex items-center justify-center py-8">
        <span className="text-sm text-muted-foreground">{t('noneAvailable')}</span>
      </div>
    )
  } else if (controls.nodes.length === 0) {
    body = (
      <div className="flex items-center justify-center py-8">
        <span className="text-sm text-muted-foreground">
          {t('noResults')} &ldquo;{searchQuery}&rdquo;
        </span>
      </div>
    )
  } else {
    body = <BimTreeView nodes={controls.nodes} controls={controls} />
  }

  return (
    <LayerViewPanel
      actions={
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0"
            onClick={controls.showAll}
            title={t('showAllTitle')}
          >
            <LR.Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0"
            onClick={controls.toggleExpandAll}
            title={controls.isFullyExpanded ? t('collapseTitle') : t('expandTitle')}
          >
            {controls.isFullyExpanded ? (
              <LR.ListCollapse className="h-4 w-4" />
            ) : (
              <LR.ListFilterPlus className="h-4 w-4" />
            )}
          </Button>
        </>
      }
    >
      {body}
    </LayerViewPanel>
  )
}
