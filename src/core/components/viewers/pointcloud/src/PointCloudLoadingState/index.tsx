'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { SquareArrowOutUpRight } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import React from 'react'

import { useBuilding, useBuildings } from '../../../../../hooks/buildings/buildings'
import { useFilesByBuildingId } from '../../../../../hooks/files/files'
import { BuildingsContext, usePermissions } from '../../../../../store'
import { cn } from '../../../../../utils/utils'
import { Button } from '../../../../ui/Button'
import { Card, CardContent, CardHeader } from '../../../../ui/Card'
import { Input } from '../../../../ui/Input'
import { LoadingSpinner } from '../../../../ui/LoadingSpinner'

// import { useAppConfigContext } from '../../../../../store/AppConfig/context'


import type { DbFile } from '../../../../../types/dbTypes'



type CreatePointCloudResponse = {
  pointCloud: {
    id: string
    name: string
  }
  upload: {
    uploadUrl: string
  }
}

export type pointCloudViewerState = 'opening' | 'loading' | 'ready' | 'error' | 'noPointCloudFiles' | 'noBuilding'

export function PointCloudLoadingState({ pointcloudApiUrl }: { pointcloudApiUrl?: string }) {
  const t = useTranslations('PointCloudLoadingState')
  const API_BASE = pointcloudApiUrl ?? 'http://localhost:5101'
  // Permissions
  const { ability } = usePermissions()

  const { state: buildingState, dispatch: buildingDispatch } = React.useContext(BuildingsContext)
  const { building: storeBuilding } = buildingState.buildings

  const searchParams = useSearchParams()
  const buildingId = searchParams.get("buildingId")
  const { building: urlBuilding, isLoading: buildingLoading, isError: buildingError } = useBuilding(buildingId ? Number(buildingId) : 0)
  const { buildings, isLoading: buildingsLoading } = useBuildings()

  // Determine the current building to use
  const building = storeBuilding || urlBuilding

  React.useEffect(() => {
    if (!storeBuilding && urlBuilding) {
      buildingDispatch({ type: "SET-CURRENT-BUILDING", payload: { building: urlBuilding } })
    }
  }, [urlBuilding, storeBuilding, buildingDispatch])

  const router = useRouter()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [currentState, setCurrentState] = React.useState<pointCloudViewerState>('opening')
  const [uploading, setUploading] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [selectedBuilding, setSelectedBuilding] = React.useState<any>(null)

  const { files, isLoading: filesLoading } = useFilesByBuildingId(building?.id)
  const pointCloudFiles: DbFile[] = React.useMemo(() => (
    files.filter(file => {
      const ext = file.extension?.toLowerCase()
      if (!ext) return false
      return ext === "laz" || ext === "las"
    })
  ), [files])

  // Fuzzy search function for buildings
  const fuzzySearchBuildings = React.useCallback((buildings: any[], searchTerm: string) => {
    if (!searchTerm.trim()) return buildings.slice(0, 10)

    const fuzzySearchScore = (search: string, text: string): number => {
      if (!search || !text) return 0
      const searchLower = search.toLowerCase()
      const textLower = text.toLowerCase()

      if (textLower === searchLower) return 1000
      if (textLower.startsWith(searchLower)) return 800
      if (textLower.includes(searchLower)) return 600

      return 0
    }

    return buildings
      .map((building) => {
        const address = building.buildingAddress || ''
        const name = building.buildingName || ''
        const id = building.id.toString()

        const addressScore = fuzzySearchScore(searchTerm, address)
        const nameScore = fuzzySearchScore(searchTerm, name)
        const idScore = fuzzySearchScore(searchTerm, id)

        const maxScore = Math.max(addressScore, nameScore, idScore)
        return { ...building, searchScore: maxScore }
      })
      .filter(building => building.searchScore > 0)
      .sort((a, b) => b.searchScore - a.searchScore)
      .slice(0, 10)
  }, [])

  // Handle search
  const handleSearch = React.useCallback((term: string) => {
    setSearchTerm(term)
    if (buildings) {
      setSearchResults(fuzzySearchBuildings(buildings, term))
    }
  }, [buildings, fuzzySearchBuildings])

  const shouldShow = (currentState === 'opening' || currentState === 'noPointCloudFiles' || currentState === 'noBuilding')

  // Handle initial state transitions
  React.useEffect(() => {
    // If building is loading, stay in opening state
    if (buildingLoading) {
      setCurrentState('opening')
      return
    }

    // If building failed to load or no buildingId provided, show noBuilding state
    if (buildingError || (!buildingId && !building)) {
      setCurrentState('noBuilding')
      return
    }

    // If we have a building but files are still loading, stay in opening state
    if (building && filesLoading) {
      setCurrentState('opening')
      return
    }

    // If we have a building but no point cloud files, show noPointCloudFiles state
    if (building && pointCloudFiles.length === 0) {
      setCurrentState('noPointCloudFiles')
      return
    }

    // We have point cloud files, hide the loading state
    if (building && pointCloudFiles.length > 0) {
      setCurrentState('ready')
    }
  }, [building, buildingLoading, buildingError, buildingId, filesLoading, pointCloudFiles.length])

  // Don't render if not visible
  if (!shouldShow) {
    return null
  }

  const handleBuildingSelect = (building: any) => {
    const url = new URL(window.location.href)
    url.searchParams.set('buildingId', building.id.toString())
    buildingDispatch({ type: 'SET-CURRENT-BUILDING', payload: { building } })
    setSelectedBuilding(building)
    setSearchTerm('')
    setSearchResults([])
    router.push(url.toString())
  }

  // Create point cloud entry
  async function createPointCloud(name: string, buildingId: number): Promise<CreatePointCloudResponse> {
    const res = await fetch('/api/point-cloud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, buildingId }),
    })

    if (!res.ok) {
      const msg = await res.text()
      throw new Error(`Create point-cloud failed: ${msg || res.status}`)
    }

    return res.json()
  }

  // Upload to presigned URL
  function uploadToPresignedUrl(
    url: string,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', url, true)

        if (onProgress) {
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const pct = Math.round((evt.loaded / evt.total) * 100)
              onProgress(pct)
            }
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed with status ${xhr.status}`))
        }

        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.send(file)
      } catch (err) {
        reject(err)
      }
    })
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const fileName = file.name
    const fileExt = fileName.toLowerCase()

    // Validate file extension
    if (!fileExt.endsWith('.laz') && !fileExt.endsWith('.las')) {
      alert('Please select a LAZ or LAS file.')
      return
    }

    setUploading(true)

    try {
      console.log('Creating point cloud entry...')
      const { pointCloud, upload } = await createPointCloud(fileName, building.id)
      console.log('Point cloud created:', pointCloud.id)

      console.log('Uploading file...')
      await uploadToPresignedUrl(upload.uploadUrl, file, (pct) => {
        console.log(`Upload progress: ${pct}%`)
      })
      console.log('Upload complete!')

      console.log('Starting conversion...')
      const convertRes = await fetch(
        `${API_BASE}/point-cloud/${encodeURIComponent(String(pointCloud.id))}/convert-to-potree`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ options: { sampling_method: 'poisson' } }),
        }
      )
      if (!convertRes.ok) throw new Error('Failed to start conversion')
      console.log('Conversion started!')

      window.location.reload()
    }
    catch (error) {
      console.error('Error uploading point cloud:', error)
      alert(
        error instanceof Error
          ? `Failed to upload: ${error.message}`
          : 'Failed to upload point cloud'
      )
      setUploading(false)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      <div className="absolute z-10 inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
        <Card className={cn("w-[536px] pointer-events-auto flex flex-col justify-start items-center gap-2")}>
          <CardHeader className="flex justify-center items-center">
            <div className="w-12 h-12 p-2 bg-card rounded-md shadow-sm border border-border flex justify-center items-center">
              {currentState === 'noBuilding' ? (
                <LR.Building2 className={cn("w-4 h-5 text-foreground", buildingsLoading && "animate-pulse")} strokeWidth={2} />
              ) : (
                <LR.Grip className={cn("w-4 h-5 text-foreground", currentState === 'opening' && "animate-pulse")} strokeWidth={2} />
              )}
            </div>
          </CardHeader>

          <CardContent className="self-stretch flex flex-col justify-start items-center gap-6 pt-0">
            <div className="self-stretch flex flex-col justify-start items-center gap-2">
              <div className="self-stretch text-center text-foreground text-xl font-semibold font-['Inter'] leading-7 flex items-center justify-center gap-2">
                {currentState === 'opening' ? (
                  <>
                    {t('openingText')}
                    <LoadingSpinner size={20} />
                  </>
                ) : currentState === 'noBuilding' ? (
                  <>
                    {t('noBuilding')}
                  </>
                ) : uploading ? (
                  <>
                    {t('uploading')}
                    <LoadingSpinner size={20} />
                  </>
                ) : (
                  t('noPointCloudLoaded')
                )}
              </div>
              {(currentState === 'noPointCloudFiles' || currentState === 'noBuilding') && !uploading && (
                <div className="self-stretch text-center text-muted-foreground text-sm font-normal font-['Inter'] leading-tight">
                  {currentState === 'noBuilding' ? t('selectBuildingHelpText') : t('helpText')}
                </div>
              )}
            </div>

            {currentState === 'noBuilding' && (
              <div className="self-stretch flex flex-col gap-3 justify-centre items-center">
                {buildingsLoading ? (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <LoadingSpinner size={16} />
                    <span>{t('loadingBuildings') || 'Loading buildings...'}</span>
                  </div>
                ) : buildings && buildings.length > 0 ? (
                  <div className="w-full relative">
                    {selectedBuilding ? (
                      <div className="relative flex justify-end items-center">
                        <Input
                          type="text"
                          value={
                            'Building: '
                            + (selectedBuilding.buildingName && selectedBuilding.buildingAddress
                              ? `${selectedBuilding.buildingName}, ${selectedBuilding.buildingAddress}`
                              : selectedBuilding.buildingName || selectedBuilding.buildingAddress || `Building ${selectedBuilding.id}`)
                          }
                          readOnly
                          className="w-full"
                        />
                        <LR.X
                          className="absolute right-2 cursor-pointer w-4 h-4 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSelectedBuilding(null)
                            setSearchTerm('')
                            setSearchResults([])
                          }}
                        />
                      </div>
                    ) : (
                      <div className="relative">
                        <LR.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder={t('searchBuildings') || 'Search buildings...'}
                          value={searchTerm}
                          onChange={(e) => handleSearch(e.target.value)}
                          className="w-full pl-10"
                          disabled={!ability.can('read', 'File')}
                        />
                      </div>
                    )}

                    {/* Search results dropdown */}
                    {searchResults.length > 0 && searchTerm !== '' && !selectedBuilding && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto z-20">
                        {searchResults.map(building => (
                          <div
                            key={building.id}
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors flex gap-2 items-center"
                            onClick={() => handleBuildingSelect(building)}
                          >
                            <LR.SquareArrowOutUpRight className="w-3 h-3" />
                            {building.buildingName
                              ? `${building.buildingName}, ${building.buildingAddress}`
                              : building.buildingAddress || `Building ${building.id}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-center">
                    {t('noBuildings') || 'No buildings available'}
                  </div>
                )}
              </div>
            )}

            {currentState === 'noPointCloudFiles' && (
              <div className="self-stretch flex justify-center items-center gap-3">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".laz,.las"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  onClick={handleUploadClick}
                  size="sm"
                  className="gap-2"
                  disabled={uploading || !ability.can('create', 'File')}
                >
                  <LR.Upload className="w-4 h-4" />
                  {uploading ? t('uploading') : t('uploadButton')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
