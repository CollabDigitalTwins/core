'use client'

import * as React from 'react'
import { FilesSection } from './src/FilesSection'
import { PointCloudsSection } from './src/PointCloudSection'
import { BuildingsContext } from '../../../../../../../store'
import { useSearchParams } from 'next/navigation'
import { useFilesByBuildingId } from '../../../../../../../hooks/files/files'
import { DbFile } from '../../../../../../../types/dbTypes'

export function FileTab() {
  const { state: buildingState } = React.useContext(BuildingsContext)
  const { building } = buildingState.buildings

  const urlBuildingId = useSearchParams().get('buildingId')
  // Resolve from the store building, else the URL param; undefined if neither is
  // ready yet (e.g. mid viewer-switch) — the hook handles undefined → no files.
  const buildingId = building?.id ?? (urlBuildingId ? Number(urlBuildingId) : undefined)

  const filesData: DbFile[] = useFilesByBuildingId(buildingId).files || []

  const pointCloudFiles: DbFile[] = []
  const nonPointCloudFiles: DbFile[] = []

  // single .map pass to populate both arrays
  filesData.map((file) => {
    const {extension, type} = file
    // const isPointCloud = extension.toLowerCase() === 'laz' || extension.toLowerCase() === 'las'
    const isPointCloud = type?.toLowerCase() === 'point-cloud-file'

    if (isPointCloud) {
      pointCloudFiles.push(file)
    } else {
      nonPointCloudFiles.push(file)
    }
  })

  return (
    <div className="flex-1 flex flex-col space-y-6 h-full py-4 overflow-hidden">
      <PointCloudsSection files={pointCloudFiles} />
      <FilesSection files={nonPointCloudFiles} />
    </div>
  )
}
