'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { FilesSection } from './src/FilesSection'


import { ModelsSection } from './src/ModelsSection'
import type { DbFile } from '../../../../../../../types/dbTypes'
import { useFiles } from '../../../../../../../hooks/files/files'
import { SearchInput } from '../../../../../../ui'

export function FileTab() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const filesData: DbFile[] = useFiles().files || []

  const BIMFiles: DbFile[] = []
  const nonBIMFiles: DbFile[] = []

  // single .map pass to populate both arrays
  filesData.map((file) => {
    const {extension} = file
    if (!extension) return
    const isBIM = extension.toLowerCase() === 'frag'

    if (isBIM) {
      BIMFiles.push(file)
    } else {
      nonBIMFiles.push(file)
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
      <div className="flex-1 min-h-0 flex flex-col divide-y">
        <div className="basis-1/2 min-h-0 overflow-hidden">
          <ModelsSection files={BIMFiles} query={searchQuery} />
        </div>
        <div className="basis-1/2 min-h-0 overflow-hidden pt-4">
          <FilesSection files={nonBIMFiles} query={searchQuery} />
        </div>
      </div>
    </div>
  )
}
