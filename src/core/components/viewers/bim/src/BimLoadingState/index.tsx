'use client'

import React from 'react'
import { Button } from '../../../../ui/Button'
import { Card, CardContent, CardHeader } from '../../../../ui/Card'
import { Input } from '../../../../ui/Input'
import { LoadingSpinner } from '../../../../ui/LoadingSpinner'
import { Upload, Box, Building2, Search, X, SquareArrowOutUpRight } from 'lucide-react'
import { BimContext, BuildingsContext, usePermissions } from '../../../../../store'
import { LoadModels } from '../LoadModels'
import { useTranslations } from 'next-intl'
import { useFilesByBuildingId, useUploadFileToBuilding } from '../../../../../hooks/files/files'
import { useFileUploadHandler } from '../../../../ui/FilesManager/src/useFileUploadHandler'
import type { DbFile as DbFile } from '../../../../../types/dbTypes'
import { cn } from '../../../../../utils/utils'
import { useSearchParams, useRouter } from 'next/navigation'
import { useBuilding, useBuildings } from '../../../../../hooks/buildings/buildings'
import { setCameraLookAt } from '../../utils/setCameraLookAt'

export type bimViewerState = 'opening' | 'loading' | 'ready' | 'error' | 'noBimFiles' | 'noBuilding'

export function BimLoadingState() {
  const t = useTranslations('BimLoadingState')
  // Permissions
  const { ability } = usePermissions()

  const { state: bimState, dispatch: bimDispatch } = React.useContext(BimContext)
  const { bimComponents, world, fragments } = bimState.bim
  const { state: buildingState, dispatch: buildingDispatch } = React.useContext(BuildingsContext)
  const { building: storeBuilding } = buildingState.buildings

  const searchParams = useSearchParams()
  const buildingId = searchParams.get("buildingId")
  const { building: urlBuilding, isLoading: buildingLoading, isError: buildingError } = useBuilding(buildingId ? Number(buildingId) : null)
  const { buildings, isLoading: buildingsLoading } = useBuildings()

  // Determine the current building to use
  const building = storeBuilding || urlBuilding

  React.useEffect(() => {
    if (!storeBuilding && urlBuilding ) {
      buildingDispatch({ type: "SET-CURRENT-BUILDING", payload: { building: urlBuilding } })
    }
  }, [urlBuilding, storeBuilding, buildingDispatch])

  const router = useRouter()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Upload file hooks
  const { uploadFile } = useUploadFileToBuilding(building?.id)

  // Use the reusable upload handler
  const { handleFileUpload } = useFileUploadHandler({
    buildingId: building?.id,
    tag: 'bim-file',
    isVisible: true,
    uploadFile,
  })

  const [currentState, setCurrentState] = React.useState<bimViewerState>('opening')
  const [hasLoadedModels, setHasLoadedModels] = React.useState(false)
  const [cameraHasMoved, setCameraHasMoved] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [selectedBuilding, setSelectedBuilding] = React.useState<any>(null)
  
  const { files, isLoading: filesLoading } = useFilesByBuildingId(building?.id)
  const bimFiles: DbFile[] = React.useMemo(() => (
    files.filter(file => {
      const ext = file?.extension?.toLowerCase()
      return ext === 'frag' || ext === 'ifc'
    })
  ), [files])

  // Fuzzy search function for buildings
  const fuzzySearchBuildings = React.useCallback((buildings: any[], searchTerm: string) => {
    if (!searchTerm.trim()) return buildings.slice(0, 10)
    
    const fuzzySearchScore = (search: string, text: string): number => {
      if (!search || !text) return 0
      const searchLower = search.toLowerCase()
      const textLower = text.toLowerCase()
      
      // Exact match gets highest score
      if (textLower === searchLower) return 1000
      // Starts with search term gets high score
      if (textLower.startsWith(searchLower)) return 800
      // Contains search term gets medium score
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

  const shouldShow = (currentState === 'opening' || currentState === 'noBimFiles' || currentState === 'loading' || currentState === 'noBuilding') && !cameraHasMoved

  // Once models have loaded, start a fallback timer to dismiss the card if camera doesn't move
  React.useEffect(() => {
    if (currentState === 'loading' && hasLoadedModels) {
      const fallbackTimer = setTimeout(() => {
        setCameraHasMoved(true)
        setCurrentState('ready')
      }, 5000)

      return () => clearTimeout(fallbackTimer)
    }
  }, [currentState, hasLoadedModels])

  // Set up camera movement detection
  React.useEffect(() => {
    if (bimState.bim.world?.camera?.controls) {
      const controls = bimState.bim.world.camera.controls

      const handleCameraChange = () => {
        setCameraHasMoved(true)
        if (hasLoadedModels) {
          setCurrentState('ready')
        }
      }

      // Listen for camera control event (when user moves the camera)
      controls.addEventListener('control', handleCameraChange)

      return () => {
        controls.removeEventListener('control', handleCameraChange)
      }
    }
  }, [bimState.bim.world, hasLoadedModels])

  const loadBimModels = React.useCallback(async () => {
    if (!bimComponents || bimFiles.length === 0) return

    try {
      // State should already be 'loading' when this is called
      const loadModels = bimComponents.get(LoadModels)

      const {sharing} = setCameraLookAt(world, searchParams)
      loadModels.sharing = sharing

      for (const bimFile of bimFiles) {
        try {
          await loadModels.load(bimFile.url, bimFile.name)
          // Apply saved 3D position after load (setupModel resets to origin)
          if ((bimFile.x != null || bimFile.y != null || bimFile.z != null) && fragments) {
            const fragModel = fragments.core.models.list.get(bimFile.name)
            if (fragModel) {
              fragModel.object.position.set(bimFile.x ?? 0, bimFile.y ?? 0, bimFile.z ?? 0)
              if (bimFile.rotation != null) fragModel.object.rotation.y = bimFile.rotation
              fragModel.object.updateMatrixWorld(true)
            }
          }
        } catch (e) {
          console.error("Error loading BIM file", bimFile.name, e)
        }
      }

      // Force update the fragments to render geometry immediately
      if (fragments) {
        fragments.core.update(true)
      }

      // Mark each loaded file as visible in the BIM store so ModelsSection reflects it
      for (const bimFile of bimFiles) {
        bimDispatch({ type: 'SET_MODEL_UI_STATE', payload: { fileId: bimFile.id, isVisible: true } })
      }

      // Signal that models have loaded — the fallback timer will dismiss the card
      setHasLoadedModels(true)
    } catch (error) {
      console.error('Error loading BIM models:', error)
      setCurrentState('error')
    }
  }, [bimComponents, bimFiles, fragments])

  // Handle initial state transitions
  React.useEffect(() => {
    // If no bimComponents available, stay in opening state
    if (!bimComponents) {
      setCurrentState('opening')
      setHasLoadedModels(false)
      return
    }

    // If building is loading, stay in opening state
    if (buildingLoading) {
      setCurrentState('opening')
      return
    }

    // If building failed to load or no buildingId provided, show noBuilding state
    if (buildingError || (!buildingId && !building)) {
      setCurrentState('noBuilding')
      setHasLoadedModels(false)
      return
    }

    // If we have a building but files are still loading, stay in opening state
    if (building && filesLoading) {
      setCurrentState('opening')
      return
    }

    // If we've already loaded models (or are currently loading), don't reload
    if (hasLoadedModels) {
      return
    }

    // If we have a building but no BIM files, show noBimFiles state
    if (building && bimFiles.length === 0) {
      setCurrentState('noBimFiles')
      return
    }

    // We have BIM files, set to loading and start loading them
    if (building && bimFiles.length > 0) {
      setCurrentState('loading')
      setCameraHasMoved(false) // Reset camera moved state for new model
      loadBimModels()
    }
  }, [bimComponents, building, buildingLoading, buildingError, buildingId, filesLoading, bimFiles.length, loadBimModels, hasLoadedModels])

  // Don't render if not visible
  if (!shouldShow) {
    return null
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]

    try {
      const modelId = file.name
      setCurrentState('loading')
      setCameraHasMoved(false) // Reset camera moved state for new upload
      await handleFileUpload(file)

      window.dispatchEvent(new CustomEvent('bim-model-loaded-from-file', { detail: { modelId } }))
      bimDispatch({
        type: 'SET_MODEL', payload: { modelId },
      })
      setCurrentState('ready')
    }
    catch (error) {
      console.error('Error uploading file:', error)
      setCurrentState('error')
    }
  }

  return (
    <>
      <div className="absolute z-10 inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
        <Card className={cn("w-[536px] pointer-events-auto flex flex-col justify-start items-center gap-2")}>
          <CardHeader className="flex justify-center items-center">
            <div className="w-12 h-12 p-2 bg-card rounded-md shadow-sm border border-border flex justify-center items-center">
              {currentState === 'noBuilding' ? (
                <Building2 className={cn("w-4 h-5 text-foreground", buildingsLoading && "animate-pulse")} strokeWidth={2} />
              ) : (
                <Box className={cn("w-4 h-5 text-foreground", currentState === 'opening' && "animate-pulse")} strokeWidth={2} />
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
                ) : currentState === 'loading' ? (
                  <>
                    {t('loadingBimModel')}
                    <LoadingSpinner size={20} />
                  </>
                ) : currentState === 'noBuilding' ? (
                  <>
                    {t('noBuilding')}
                  </>
                ) : (
                  t('noBIMLoaded')
                )}
              </div>
              {(currentState === 'noBimFiles' || currentState === 'noBuilding') && (
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
                        <X 
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
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder={t('searchBuildings') || 'Search buildings...'}
                          value={searchTerm}
                          onChange={(e) => handleSearch(e.target.value)}
                          className="w-full pl-10"
                          disabled={!ability.can('read', 'Building')}
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
                            <SquareArrowOutUpRight className="w-3 h-3" />
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

            {currentState === 'noBimFiles' && (
              <div className="self-stretch flex justify-center items-center gap-3">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".ifc,.frag"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  onClick={handleUploadClick}
                  size="sm"
                  className="gap-2"
                  disabled={!ability.can('create', 'File')}
                >
                  <Upload className="w-4 h-4" />
                  {t('uploadButton')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
