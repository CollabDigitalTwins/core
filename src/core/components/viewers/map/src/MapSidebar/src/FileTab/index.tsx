"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useFiles } from '../../../../../../../hooks/files/files'
import { partitionBySection } from '../../../../../../ui/FilesManager/src/fileType'
import { ViewerSidebarPanel } from '../../../../../../ui/ViewerSidebar/Panel'

import { FilesSection } from './src/FilesSection'
import { ModelsSection } from './src/ModelsSection'

import type { DbFile } from '../../../../../../../types/dbTypes'

export function FileTab() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const t = useTranslations('FileSelection')
  const filesData: DbFile[] = useFiles().files || []

  const buckets = React.useMemo(
    () => partitionBySection(filesData.filter(file => file.tag !== 'user')),
    [filesData],
  )

  const tf = React.useCallback(
    (key: string, fallback: string) => (t.has(key) ? t(key) : fallback),
    [t],
  )

  return (
    <ViewerSidebarPanel search={{ value: searchQuery, onChange: setSearchQuery }}>
      <div className="flex-1 min-h-0 flex flex-col divide-y">
        <div className="basis-1/4 min-h-0 overflow-hidden">
          <ModelsSection files={buckets.bim} query={searchQuery} />
        </div>
        <div className="basis-1/4 min-h-0 overflow-hidden pt-4">
          <FilesSection
            files={buckets.models}
            query={searchQuery}
            section="models"
            title={tf('modelsTitle', 'Models')}
            icon={LR.Box}
            acceptedFileTypes=".glb,.gltf,.fbx,.obj,.dae,.ply,.spz,.splat,.ksplat,.sog"
          />
        </div>
        <div className="basis-1/4 min-h-0 overflow-hidden pt-4">
          <FilesSection
            files={buckets.pointClouds}
            query={searchQuery}
            section="pointClouds"
            title={tf('pointCloudsTitle', 'Point clouds')}
            icon={LR.Scan}
            acceptedFileTypes=".las,.laz,.copc,.copc.laz,.e57"
          />
        </div>
        <div className="basis-1/4 min-h-0 overflow-hidden pt-4">
          <FilesSection files={buckets.files} query={searchQuery} section="files" />
        </div>
      </div>
    </ViewerSidebarPanel>
  )
}
