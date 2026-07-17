'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { ModelsSection } from './src/ModelsSection'
import { FilesSection } from './src/FilesSection'
import { BuildingsContext } from '../../../../../../../store'
import { useSearchParams } from 'next/navigation'
import { useFilesByBuildingId } from '../../../../../../../hooks/files/files'
import { DbFile } from '../../../../../../../types/dbTypes'
import { SearchInput } from '../../../../../../ui'

  export function FileTab() {
    const { state: buildingState } = React.useContext(BuildingsContext)
    const { building } = buildingState.buildings
    let buildingId:number;
    const [searchQuery, setSearchQuery] = React.useState('')

  const urlBuildingId = useSearchParams().get('buildingId')

  if (building) buildingId = building.id
  else if (urlBuildingId) buildingId = Number(urlBuildingId)

  const filesData: DbFile[] = useFilesByBuildingId(buildingId).files || []

  const bimFiles: DbFile[] = []
  const nonBimFiles: DbFile[] = []

  // single .map pass to populate both arrays
  filesData.map((file) => {
    const {extension} = file
    if (!extension) return
    const isBim = extension.toLowerCase() === 'ifc' || extension.toLowerCase() === 'frag'

    if (isBim) {
      bimFiles.push(file)
    } else {
      nonBimFiles.push(file)
    }
  })


  return (
    <div className="flex-1 flex flex-col space-y-6 py-4 overflow-hidden">
      <div className="px-4">
        <SearchInput
          placeholder="Search..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>
      <ModelsSection files={bimFiles} query={searchQuery} />
      <FilesSection files={nonBimFiles} query={searchQuery} />
    </div>
  )
}
