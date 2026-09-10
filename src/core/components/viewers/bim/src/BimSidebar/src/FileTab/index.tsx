'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useFilesByBuildingId } from '../../../../../../../hooks/files/files'
import { BuildingsContext, MenusContext } from '../../../../../../../store'
import { ViewerSidebarPanel } from '../../../../../../ui/ViewerSidebar/Panel'
import { useLongPressReorder } from '../../../../../../ui/ViewerSidebar/useLongPressReorder'
import { useResizableSections } from '../../../../../../ui/ViewerSidebar/useResizableSections'

import { BimSection } from './src/BimSection'
import { FilesSection } from './src/FilesSection'
import { ModelsSection } from './src/ModelsSection'
import { orderFileTabSections } from './src/orderFileTabSections'
import { partitionFileTab } from './src/partitionFileTab'
import { PointCloudsSection } from './src/PointCloudsSection'
import { resolveOpenSections } from './src/resolveOpenSections'

import type { FileTabSectionChrome } from './src/sectionChrome'
import type { DbFile } from '../../../../../../../types/dbTypes'
import type { FileSection as FileSectionId } from '../../../../../../ui/FilesManager/src/fileType'

/** Share of the flexible height each section takes, and the least it may shrink to. */
const DEFAULT_WEIGHTS: Record<FileSectionId, number> = { bim: 25, models: 25, pointClouds: 25, files: 25 }
const MIN_WEIGHTS: Record<FileSectionId, number> = { bim: 15, models: 15, pointClouds: 15, files: 15 }

export function FileTab() {
  const tSidebar = useTranslations('ViewerSidebar')

  const { state: buildingState } = React.useContext(BuildingsContext)
  const { building } = buildingState.buildings
  const { state: menusState, dispatch: menusDispatch } = React.useContext(MenusContext)
  const [searchQuery, setSearchQuery] = React.useState('')

  const urlBuildingId = useSearchParams().get('buildingId')
  // Store building, else the URL param; undefined mid viewer-switch resolves to no files.
  const buildingId = building?.id ?? (urlBuildingId ? Number(urlBuildingId) : undefined)

  const filesData: DbFile[] = useFilesByBuildingId(buildingId).files || []
  const buckets = React.useMemo(() => partitionFileTab(filesData), [filesData])

  const counts = React.useMemo<Record<FileSectionId, number>>(() => ({
    bim: buckets.bim.length,
    models: buckets.models.length,
    pointClouds: buckets.pointClouds.length,
    files: buckets.files.length,
  }), [buckets])

  const [explicitOpen, setExplicitOpen] = React.useState<Partial<Record<FileSectionId, boolean>>>({})
  const openSections = React.useMemo(
    () => resolveOpenSections(explicitOpen, counts),
    [explicitOpen, counts],
  )
  const setOpen = (id: FileSectionId) => (value: boolean) =>
    setExplicitOpen(current => ({ ...current, [id]: value }))

  const storedOrder = menusState.menus.fileTabSectionOrder
  const settledOrder = React.useMemo(
    () => orderFileTabSections(storedOrder, counts),
    [storedOrder, counts],
  )

  const reorder = useLongPressReorder<FileSectionId>({
    ids: settledOrder,
    onReorder: fileTabSectionOrder =>
      menusDispatch({ type: 'SET_FILE_TAB_SECTION_ORDER', payload: { fileTabSectionOrder } }),
  })
  const sectionIds = reorder.order

  const { layoutRef, gridTemplateRows, separatorAfter, beginResize } = useResizableSections({
    ids: sectionIds,
    defaultWeights: DEFAULT_WEIGHTS,
    minWeights: MIN_WEIGHTS,
    open: openSections,
  })

  const renderSection = (id: FileSectionId, chrome: FileTabSectionChrome) => {
    switch (id) {
      case 'bim':
        return <BimSection files={buckets.bim} query={searchQuery} {...chrome} />
      case 'models':
        return <ModelsSection files={buckets.models} query={searchQuery} {...chrome} />
      case 'pointClouds':
        return (
          <PointCloudsSection
            files={buckets.pointClouds}
            query={searchQuery}
            buildingId={buildingId ?? 0}
            {...chrome}
          />
        )
      case 'files':
        return <FilesSection files={buckets.files} query={searchQuery} {...chrome} />
    }
  }

  return (
    <ViewerSidebarPanel search={{ value: searchQuery, onChange: setSearchQuery }}>
      <div ref={layoutRef} className="grid flex-1 min-h-0" style={{ gridTemplateRows }}>
        {sectionIds.map(id => (
          <React.Fragment key={id}>
            <div className="min-h-0 overflow-hidden">
              {renderSection(id, {
                open: openSections[id],
                onOpenChange: setOpen(id),
                dragHandleProps: reorder.handlersFor(id),
                isReordering: reorder.activeId === id,
              })}
            </div>

            {separatorAfter(id) && (
              <div
                role="separator"
                aria-orientation="horizontal"
                aria-label={tSidebar('resizeSectionsLabel')}
                className="group flex items-center justify-center cursor-row-resize select-none touch-none"
                onPointerDown={beginResize(id)}
              >
                <div className="h-px w-full bg-border transition-colors group-hover:bg-primary/50" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </ViewerSidebarPanel>
  )
}
