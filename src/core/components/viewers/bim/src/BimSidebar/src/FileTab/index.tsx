'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useSearchParams } from 'next/navigation'
import * as React from 'react'

import { useFilesByBuildingId } from '../../../../../../../hooks/files/files'
import { BuildingsContext } from '../../../../../../../store'
import { ViewerSidebarPanel } from '../../../../../../ui/ViewerSidebar/Panel'

import { isRenderablePointCloud } from '../../../PointClouds/pointCloudFiles'

import { FilesSection } from './src/FilesSection'
import { ModelsSection } from './src/ModelsSection'
import { PointCloudsSection } from './src/PointCloudsSection'

import type { DbFile } from '../../../../../../../types/dbTypes'

export function FileTab() {
  const { state: buildingState } = React.useContext(BuildingsContext)
  const { building } = buildingState.buildings
  const [searchQuery, setSearchQuery] = React.useState('')

  const urlBuildingId = useSearchParams().get('buildingId')
  // Resolve from the store building, else the URL param; undefined if neither is
  // ready yet (e.g. mid viewer-switch) — the hook handles undefined → no files.
  const buildingId = building?.id ?? (urlBuildingId ? Number(urlBuildingId) : undefined)

  const filesData: DbFile[] = useFilesByBuildingId(buildingId).files || []

  const bimFiles: DbFile[] = []
  const pointCloudFiles: DbFile[] = []
  const nonBimFiles: DbFile[] = []

  // single pass to populate the arrays
  filesData.forEach((file) => {
    const { extension } = file
    if (!extension) return
    const isBim = extension.toLowerCase() === 'ifc' || extension.toLowerCase() === 'frag'

    if (isBim) {
      bimFiles.push(file)
    } else if (isRenderablePointCloud(file)) {
      pointCloudFiles.push(file)
    } else {
      nonBimFiles.push(file)
    }
  })

  return (
    <ViewerSidebarPanel search={{ value: searchQuery, onChange: setSearchQuery }}>
      <ModelsSection files={bimFiles} query={searchQuery} />
      <PointCloudsSection files={pointCloudFiles} query={searchQuery} buildingId={buildingId ?? 0} />
      <FilesSection files={nonBimFiles} query={searchQuery} />
    </ViewerSidebarPanel>
  )
}
