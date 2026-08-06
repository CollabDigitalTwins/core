'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { BimContext } from '../../../../../../../../store'
import { Button } from '../../../../../../../ui/Button'
import { IfcClasses } from '../../../../IfcClasses'
import { useBimTreeControls } from '../../../../lib/useBimTreeControls'

import { useAppearance } from './AppearanceProvider'
import { BimTreeView } from './BimTreeView'
import { LayerViewPanel } from './LayerViewPanel'

import type { BimTreeNode } from '../../../../lib/bimTree'

interface Props {
  /** Filter query from the shared search bar at the top of the LayersTab. */
  searchQuery: string
}

/**
 * Sidebar section listing every IFC class present in the loaded models
 * (IFCWALL, IFCSLAB, …) with select / hide / isolate per class.
 *
 * The counterpart to the spatial tree: same actions, grouped by what an element
 * *is* rather than where it sits. Class names are shown exactly as the IFC
 * defines them, deliberately untranslated.
 */
export function IfcClassesSection({ searchQuery }: Props) {
  const t = useTranslations('LayersTab')
  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents } = bimState.bim
  const { clearSource, hasOverrides } = useAppearance()

  const [classes, setClasses] = React.useState<BimTreeNode[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (!bimComponents) return

    const ifcClasses = bimComponents.get(IfcClasses)

    setClasses(ifcClasses.classes)
    setIsLoading(ifcClasses.isLoading)

    const onClasses = (data: { classes: BimTreeNode[] }) => setClasses(data.classes)
    const onLoading = (data: { isLoading: boolean }) => setIsLoading(data.isLoading)

    ifcClasses.onClassesChanged.add(onClasses)
    ifcClasses.onLoadingStateChanged.add(onLoading)

    // Models may already be loaded by the time the sidebar mounts, in which case
    // the load events that normally trigger classification have come and gone.
    if (ifcClasses.classes.length === 0) void ifcClasses.refresh()

    return () => {
      ifcClasses.onClassesChanged.remove(onClasses)
      ifcClasses.onLoadingStateChanged.remove(onLoading)
    }
  }, [bimComponents])

  const controls = useBimTreeControls({
    components: bimComponents,
    nodes: classes,
    searchQuery,
  })

  let body: React.ReactNode
  if (isLoading && classes.length === 0) {
    body = (
      <div className="flex items-center justify-center py-8">
        <LR.Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">{t('loadingClasses')}</span>
      </div>
    )
  } else if (classes.length === 0) {
    body = (
      <div className="flex items-center justify-center py-8">
        <span className="text-sm text-muted-foreground">{t('noClasses')}</span>
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
    body = <BimTreeView nodes={controls.nodes} controls={controls} source="ifc-class" />
  }

  return (
    <LayerViewPanel
      count={classes.length}
      actions={
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0"
            onClick={() => clearSource('ifc-class')}
            disabled={!hasOverrides('ifc-class')}
            title={t('resetColorsTitle')}
          >
            <LR.Paintbrush className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0"
            onClick={controls.showAll}
            title={t('showAllTitle')}
          >
            <LR.Eye className="h-4 w-4" />
          </Button>
        </>
      }
    >
      {body}
    </LayerViewPanel>
  )
}
