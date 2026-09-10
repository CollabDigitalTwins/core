'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useFilesByBuildingId } from '../../../../../../../hooks/files/files'
import { BuildingsContext } from '../../../../../../../store'
import { ViewerSidebarPanel } from '../../../../../../ui/ViewerSidebar/Panel'
import { useResizableSections } from '../../../../../../ui/ViewerSidebar/useResizableSections'

import { BimSection } from './src/BimSection'
import { FilesSection } from './src/FilesSection'
import { ModelsSection } from './src/ModelsSection'
import { partitionFileTab } from './src/partitionFileTab'
import { PointCloudsSection } from './src/PointCloudsSection'

import type { DbFile } from '../../../../../../../types/dbTypes'
import type { FileSection as FileSectionId } from '../../../../../../ui/FilesManager/src/fileType'

const SECTION_IDS: readonly FileSectionId[] = ['bim', 'models', 'pointClouds', 'files']

/** Share of the flexible height each section takes, and the least it may shrink to. */
const DEFAULT_WEIGHTS: Record<FileSectionId, number> = { bim: 25, models: 25, pointClouds: 25, files: 25 }
const MIN_WEIGHTS: Record<FileSectionId, number> = { bim: 15, models: 15, pointClouds: 15, files: 15 }

export function FileTab() {
  const tLayout = useTranslations('LayersTab')

  const { state: buildingState } = React.useContext(BuildingsContext)
  const { building } = buildingState.buildings
  const [searchQuery, setSearchQuery] = React.useState('')

  const urlBuildingId = useSearchParams().get('buildingId')
  // Store building, else the URL param; undefined mid viewer-switch resolves to no files.
  const buildingId = building?.id ?? (urlBuildingId ? Number(urlBuildingId) : undefined)

  const filesData: DbFile[] = useFilesByBuildingId(buildingId).files || []
  const buckets = React.useMemo(() => partitionFileTab(filesData), [filesData])

  const [openSections, setOpenSections] = React.useState<Record<FileSectionId, boolean>>({
    bim: true,
    models: true,
    pointClouds: true,
    files: true,
  })
  const setOpen = (id: FileSectionId) => (value: boolean) =>
    setOpenSections(current => ({ ...current, [id]: value }))

  const { layoutRef, gridTemplateRows, separatorAfter, beginResize } = useResizableSections({
    ids: SECTION_IDS,
    defaultWeights: DEFAULT_WEIGHTS,
    minWeights: MIN_WEIGHTS,
    open: openSections,
  })

  return (
    <ViewerSidebarPanel search={{ value: searchQuery, onChange: setSearchQuery }}>
      <div ref={layoutRef} className="grid flex-1 min-h-0" style={{ gridTemplateRows }}>
        <div className="min-h-0 overflow-hidden">
          <BimSection
            files={buckets.bim}
            query={searchQuery}
            open={openSections.bim}
            onOpenChange={setOpen('bim')}
          />
        </div>

        {separatorAfter('bim') && (
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label={tLayout('resizeSectionsLabel')}
            className="group flex items-center justify-center cursor-row-resize select-none touch-none"
            onPointerDown={beginResize('bim')}
          >
            <div className="h-px w-full bg-border transition-colors group-hover:bg-primary/50" />
          </div>
        )}

        <div className="min-h-0 overflow-hidden">
          <ModelsSection
            files={buckets.models}
            query={searchQuery}
            open={openSections.models}
            onOpenChange={setOpen('models')}
          />
        </div>

        {separatorAfter('models') && (
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label={tLayout('resizeSectionsLabel')}
            className="group flex items-center justify-center cursor-row-resize select-none touch-none"
            onPointerDown={beginResize('models')}
          >
            <div className="h-px w-full bg-border transition-colors group-hover:bg-primary/50" />
          </div>
        )}

        <div className="min-h-0 overflow-hidden">
          <PointCloudsSection
            files={buckets.pointClouds}
            query={searchQuery}
            buildingId={buildingId ?? 0}
            open={openSections.pointClouds}
            onOpenChange={setOpen('pointClouds')}
          />
        </div>

        {separatorAfter('pointClouds') && (
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label={tLayout('resizeSectionsLabel')}
            className="group flex items-center justify-center cursor-row-resize select-none touch-none"
            onPointerDown={beginResize('pointClouds')}
          >
            <div className="h-px w-full bg-border transition-colors group-hover:bg-primary/50" />
          </div>
        )}

        <div className="min-h-0 overflow-hidden">
          <FilesSection
            files={buckets.files}
            query={searchQuery}
            open={openSections.files}
            onOpenChange={setOpen('files')}
          />
        </div>
      </div>
    </ViewerSidebarPanel>
  )
}
