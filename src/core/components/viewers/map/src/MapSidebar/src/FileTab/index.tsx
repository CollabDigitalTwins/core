"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useFiles } from '../../../../../../../hooks/files/files'
import { SECTION_ICONS, partitionBySection } from '../../../../../../ui/FilesManager/src/fileType'
import { ViewerSidebarPanel } from '../../../../../../ui/ViewerSidebar/Panel'
import { useResizableSections } from '../../../../../../ui/ViewerSidebar/useResizableSections'

import { FilesSection } from './src/FilesSection'
import { ModelsSection } from './src/ModelsSection'
import { orderMapFileSections } from './src/orderMapFileSections'

import type { DbFile } from '../../../../../../../types/dbTypes'
import type { FileSection } from '../../../../../../ui/FilesManager/src/fileType'

/** Share of the flexible height each section takes, and the least it may shrink to. */
const DEFAULT_WEIGHTS: Record<FileSection, number> = { bim: 25, models: 25, pointClouds: 25, files: 25 }
const MIN_WEIGHTS: Record<FileSection, number> = { bim: 15, models: 15, pointClouds: 15, files: 15 }

export function FileTab() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const t = useTranslations('FileSelection')
  const tSidebar = useTranslations('ViewerSidebar')
  const filesData: DbFile[] = useFiles().files || []

  const buckets = React.useMemo(
    () => partitionBySection(filesData.filter(file => file.tag !== 'user')),
    [filesData],
  )

  const tf = React.useCallback(
    (key: string, fallback: string) => (t.has(key) ? t(key) : fallback),
    [t],
  )

  const [openSections, setOpenSections] = React.useState<Record<FileSection, boolean>>({
    bim: true, models: true, pointClouds: true, files: true,
  })
  const setOpen = (id: FileSection) => (value: boolean) =>
    setOpenSections(current => ({ ...current, [id]: value }))

  const sectionIds = React.useMemo(
    () => orderMapFileSections(['bim', 'models', 'pointClouds', 'files'], openSections),
    [openSections],
  )

  const { layoutRef, gridTemplateRows, separatorAfter, beginResize } = useResizableSections({
    ids: sectionIds,
    defaultWeights: DEFAULT_WEIGHTS,
    minWeights: MIN_WEIGHTS,
    open: openSections,
  })

  const renderSection = (id: FileSection) => {
    const chrome = { open: openSections[id], onOpenChange: setOpen(id) }

    switch (id) {
      case 'bim':
        return <ModelsSection files={buckets.bim} query={searchQuery} {...chrome} />
      case 'models':
        return (
          <FilesSection
            files={buckets.models}
            query={searchQuery}
            section="models"
            title={tf('modelsTitle', 'Models')}
            icon={SECTION_ICONS.models}
            acceptedFileTypes=".glb,.gltf,.fbx,.obj,.dae,.ply,.spz,.splat,.ksplat,.sog"
            {...chrome}
          />
        )
      case 'pointClouds':
        return (
          <FilesSection
            files={buckets.pointClouds}
            query={searchQuery}
            section="pointClouds"
            title={tf('pointCloudsTitle', 'Point clouds')}
            icon={SECTION_ICONS.pointClouds}
            acceptedFileTypes=".las,.laz,.copc,.copc.laz,.e57"
            {...chrome}
          />
        )
      case 'files':
        return <FilesSection files={buckets.files} query={searchQuery} section="files" {...chrome} />
    }
  }

  return (
    <ViewerSidebarPanel search={{ value: searchQuery, onChange: setSearchQuery }}>
      <div ref={layoutRef} className="grid flex-1 min-h-0" style={{ gridTemplateRows }}>
        {sectionIds.map(id => (
          <React.Fragment key={id}>
            <div className="min-h-0 overflow-hidden">{renderSection(id)}</div>

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
