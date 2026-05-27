'use client'

// Icons
import * as LR from 'lucide-react'
// Dependencies
import * as  React from 'react'
import { useTranslations } from 'next-intl'
import { usePermissions } from '../../../../store'
import { usePathname } from 'next/navigation'

import type { Dataset } from '../../../../types/datasetTypes'
import { useOpenDataPortalsByCountrySubdivision, useOpenDataPortalsByGroup, useOpenDataPortalsByMunicipality } from '../../../../hooks/openDataPortals/openDataPortals'
import { DatasetsContext, MenusContext, useMapContext } from '../../../../store'
import { useAppConfigContext } from '../../../../store/AppConfig/context'
import { Badge } from '../../../../components/ui/Badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../../../components/ui/Breadcrumb'
import { Button } from '../../../../components/ui/Button'
import { DataTable } from '../../../../components/ui/DataTable'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/Dialog'
import { Input } from '../../../../components/ui/Input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/Tabs'
// Data
import { useColumns } from './data'
import DatasetDetails from './DatasetDetails'
// Custom components
import { AddPortalDialog } from './AddPortalDialog'
import DatasetSkeleton from './DatasetSkeleton'
import Filters from './Filters'
import RowActions from './RowActions'
import { useDatasetsForPortals } from './src/useDatasetsForPortals'
import { handleFavouriteDataset } from './utils'
import { fetchLocalDatasets } from './src/localDatasets'
import { fetchOrganizationalMinioDatasets } from './src/minioDatasets'
import { useFastDatasetCache } from './src/useFastDatasetCache'
import { DatasetGroup } from '../../../../types/dbTypes'

type OrgVisibility = {
  isAdmin: boolean
  currentOrgId: number
  allowedOrgIds: number[]
}

const ADMIN_ALLOWED_ORGS = [1, 2, 3, 4, 5, 6]
const ORG_BY_PATH_PREFIX: Record<string, number> = {
  '/envirocentre': 1,
  '/dnd': 3,
  '/canada': 4,
  '/gac': 5,
  '/carleton': 6,
}

function normalizeOrgId(org?: number | string | null) {
  if (org === null || org === undefined) return undefined
  const parsed = typeof org === 'number' ? org : Number.parseInt(String(org), 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function getOrgVisibilityFromPath(pathname?: string | null): OrgVisibility {
  const normalizedPath = (pathname || '').toLowerCase()
  const firstSegment = normalizedPath.split('/').filter(Boolean)[0]
  const prefix = firstSegment ? `/${firstSegment}` : ''

  if (prefix === '/cdt') {
    return {
      isAdmin: true,
      currentOrgId: 1,
      allowedOrgIds: ADMIN_ALLOWED_ORGS,
    }
  }

  const currentOrgId = ORG_BY_PATH_PREFIX[prefix] ?? 2
  const allowedOrgIds = Array.from(new Set([2, currentOrgId]))

  return {
    isAdmin: false,
    currentOrgId,
    allowedOrgIds,
  }
}

function datasetVisibleForOrg(dataset: Dataset, visibility: OrgVisibility) {
  if (visibility.isAdmin) return true
  if (dataset.group !== DatasetGroup.Organizational) return true

  const orgId = normalizeOrgId(dataset.organization)
  if (orgId === undefined) return false

  return visibility.allowedOrgIds.includes(orgId)
}


type DatasetsProps = {
  isOpen: boolean
  setIsOpenAction: (open: boolean) => void
}

export default function Datasets({ isOpen, setIsOpenAction }: DatasetsProps) {
  // Translation
  const t = useTranslations('Datasets')

  // Permissions
  const { ability } = usePermissions()

  const datasetColumns = useColumns()

  // Contexts
  const { state: mapState } = useMapContext()
  const { currentLocation } = mapState.map
  const { state: appConfigState } = useAppConfigContext()
  const orgCountry = (appConfigState.appConfig.organization?.country || '').toUpperCase()
  const org = appConfigState.appConfig.organization
  // Fall back to org fixed location when currentLocation hasn't been set yet (e.g. before map hover)
  const municipality = currentLocation?.municipality ?? org?.municipality ?? null
  const countrySubdivision = currentLocation?.countrySubdivision ?? org?.countrySubdivision ?? null
  const { state: datasetState, dispatch: datasetDispatch } = React.useContext(DatasetsContext)
  const { addedDatasets } = datasetState.datasets
  const { state: menusState } = React.useContext(MenusContext)
  const { rowsPerPage } = menusState.menus

  const pathname = usePathname()
  const orgVisibility = React.useMemo(() => getOrgVisibilityFromPath(pathname), [pathname])

  // UI State
  const [view, setView] = React.useState<'table' | 'detail'>('table')
  const [selectedDataset, setSelectedDataset] = React.useState<Dataset | null>(null)
  const [favouriteDatasets, setFavouriteDatasets] = React.useState<Dataset[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')
  const [appliedFilters, setAppliedFilters] = React.useState<{ countrySubdivisions: string[], municipalities: string[], types: string[], sources: string[] }>({ countrySubdivisions: [], municipalities: [], types: [], sources: [] })
  const [currentTab, setCurrentTab] = React.useState('all')
  const [isAddPortalOpen, setIsAddPortalOpen] = React.useState(false)
  const showMunicipalTab = React.useMemo(() => Boolean(municipality), [municipality])

  const { openDataPortals: municipalPortals } = useOpenDataPortalsByMunicipality(municipality)
  const { openDataPortals: subdivisionPortals } = useOpenDataPortalsByCountrySubdivision(countrySubdivision)
  const { openDataPortals: nationalPortals } = useOpenDataPortalsByGroup(DatasetGroup.National)

  // Belt-and-suspenders country guard: portal.country must match org, or be unset (legacy/global)
  const matchesOrgCountry = React.useCallback(
    (portalCountry: string | null | undefined) => {
      if (!orgCountry) return true // org country unknown — show everything
      if (!portalCountry) return true // portal has no country set — treat as global
      return portalCountry.toUpperCase() === orgCountry
    },
    [orgCountry],
  )

  const filteredMunicipalPortals = React.useMemo(() => {
    if (!Array.isArray(municipalPortals)) return []
    const filtered = municipalPortals.filter(p => matchesOrgCountry(p.country))
    return filtered
  }, [municipalPortals, matchesOrgCountry, municipality])
  const filteredSubdivisionPortals = React.useMemo(
    () => (Array.isArray(subdivisionPortals)
      ? subdivisionPortals.filter(p => p.municipality == null && matchesOrgCountry(p.country))
      : []),
    [subdivisionPortals, matchesOrgCountry],
  )
  const filteredNationalPortals = React.useMemo(() => {
    if (!Array.isArray(nationalPortals)) return []
    const filtered = nationalPortals.filter(p => matchesOrgCountry(p.country))
    return filtered
  }, [nationalPortals, orgCountry, matchesOrgCountry])

  const municipal = useDatasetsForPortals(filteredMunicipalPortals, { rowsPerPage })
  const subdivision = useDatasetsForPortals(filteredSubdivisionPortals, { rowsPerPage })
  const national = useDatasetsForPortals(filteredNationalPortals, { rowsPerPage })
  React.useEffect(() => {
    const loadOrganizationalDatasets = async () => {
      // Two parallel sources: Martin vector tiles (if configured) and MinIO-
      // backed GeoJSON uploads (the "Add Dataset" path). Errors from either
      // are isolated so a failure on one side does not block the other.
      const martinBaseUrl = process.env.NEXT_PUBLIC_MARTIN_SERVER_URL?.replace(/\/+$/, '')

      const martinPromise: Promise<Dataset[]> = martinBaseUrl
        ? (async () => {
            const datasetsUrl = martinBaseUrl.includes('/tiles/index.json')
              ? martinBaseUrl
              : `${martinBaseUrl}/tiles/index.json`

            const localPortal = {
              id: -1,
              name: 'Organizational Datasets',
              apiUrl: datasetsUrl,
              dataManagementSystem: 'Other' as const,
              countrySubdivision: null,
              municipality: null,
              group: 'Organizational' as const,
            }

            try {
              return await fetchLocalDatasets(localPortal as any)
            }
            catch (err) {
              console.error('Failed to load Martin organizational datasets:', err)
              return []
            }
          })()
        : Promise.resolve([])

      if (!martinBaseUrl) {
        console.warn('NEXT_PUBLIC_MARTIN_SERVER_URL not configured — skipping Martin pre-load')
      }

      // The MinIO key prefix is the *session* organization (set server-side
      // by the upload route), not orgVisibility.currentOrgId (which is
      // path-derived and hardcoded for admin routes like /cdt).
      const sessionOrgId = typeof org?.id === 'number'
        ? org.id
        : Number.parseInt(String(org?.id ?? ''), 10)
      const minioPromise: Promise<Dataset[]> = Number.isFinite(sessionOrgId)
        ? fetchOrganizationalMinioDatasets(sessionOrgId).catch((err) => {
            console.error('Failed to load MinIO organizational datasets:', err)
            return []
          })
        : Promise.resolve([])

      const [martinDatasets, minioDatasets] = await Promise.all([martinPromise, minioPromise])
      const combined = [...martinDatasets, ...minioDatasets]
      const visibleOrgDatasets = combined.filter(ds => datasetVisibleForOrg(ds, orgVisibility))

      if (visibleOrgDatasets.length > 0) {
        datasetDispatch({
          type: 'SET_DATASETS',
          payload: { datasets: visibleOrgDatasets },
        })
      }
      else {
        console.warn('No organizational datasets found')
      }
    }

    loadOrganizationalDatasets()
  }, [datasetDispatch, orgVisibility, org?.id])

  const nationalDatasets = national.datasets
  const subdivisionDatasets = subdivision.datasets
  const municipalDatasets = municipal.datasets

  const isLoadingNational = national.isLoading && nationalDatasets.length === 0
  const isLoadingSubdivision = subdivision.isLoading && subdivisionDatasets.length === 0
  const isLoadingMunicipal = municipal.isLoading && municipalDatasets.length === 0

  const datasetsError = React.useMemo(() => {
    if (currentTab === 'municipal' && municipal.isError && municipalDatasets.length === 0) return t('failedFetchError')
    if (currentTab === 'countrySubdivision' && subdivision.isError && subdivisionDatasets.length === 0) return t('failedFetchError')
    if (currentTab === 'national' && national.isError && nationalDatasets.length === 0) return t('failedFetchError')
    return null
  }, [currentTab, municipal.isError, municipalDatasets.length, subdivision.isError, subdivisionDatasets.length, national.isError, nationalDatasets.length, t])

  const allDatasets = React.useMemo(() => {
    const unfiltered = [
      ...nationalDatasets,
      ...subdivisionDatasets,
      ...municipalDatasets,
      ...addedDatasets,
      ...(datasetState.datasets.datasets || []),
    ]

    const filtered = unfiltered.filter(ds => datasetVisibleForOrg(ds, orgVisibility))

    return filtered
  }, [nationalDatasets, subdivisionDatasets, municipalDatasets, datasetState.datasets.datasets, addedDatasets, orgVisibility])

  const currentTabLoading = React.useMemo(() => {
    switch (currentTab) {
      case 'national':
        return isLoadingNational
      case 'countrySubdivision':
        return isLoadingSubdivision
      case 'municipal':
        return isLoadingMunicipal
      case 'all':
        // Show loading for "all" if any datasets are loading and we have no data yet
        return (isLoadingNational || isLoadingSubdivision || isLoadingMunicipal) && 
               allDatasets.length === 0
      case 'organizational':
        // Show loading for "organizational" if any datasets are loading and we have no organizational data yet
        return (isLoadingNational || isLoadingSubdivision || isLoadingMunicipal) && 
               allDatasets.filter(ds => ds.group === 'Organizational').length === 0
      default:
        return false
    }
  }, [currentTab, isLoadingNational, isLoadingSubdivision, isLoadingMunicipal, allDatasets])

  React.useEffect(() => {
    if (!showMunicipalTab && currentTab === 'municipal') {
      setCurrentTab('all')
    }
  }, [showMunicipalTab, currentTab])

  // Memoized datasets for current tab
  const currentTabDatasets = React.useMemo(() => {
    switch (currentTab) {
      case 'applied':
        return allDatasets.filter(ds => addedDatasets.some(d => d.name === ds.name))
      case 'favourites':
        return allDatasets.filter(ds => favouriteDatasets.some(fav => fav.name === ds.name))
      case 'organizational':
        return allDatasets.filter(ds => ds.group === 'Organizational')
      case 'liveData':
        return allDatasets.filter(ds => ds.portal?.live === true)
      case 'national':
        return nationalDatasets
      case 'countrySubdivision':
        return subdivisionDatasets
      case 'municipal':
        return municipalDatasets
      case 'all':
      default:
        return allDatasets
    }
  }, [currentTab, allDatasets, addedDatasets, favouriteDatasets, nationalDatasets, subdivisionDatasets, municipalDatasets])

  // Memoized filtered data
  const filteredData = React.useMemo(() => {
    return currentTabDatasets.filter((dataset) => {
      // Search filter
      const matchesSearch = Object.values(dataset).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase()),
      )
      if (!matchesSearch)
        return false

      // Country subdivision filter
      const matchesSubdivision
        = appliedFilters.countrySubdivisions.length === 0
          || !dataset.countrySubdivision
          || appliedFilters.countrySubdivisions.includes(dataset.countrySubdivision)

      // Municipality filter
      const matchesMunicipality
        = appliedFilters.municipalities.length === 0
          || !dataset.municipality
          || appliedFilters.municipalities.includes(dataset.municipality)

      // Type filter
      const matchesType
        = appliedFilters.types.length === 0
          || appliedFilters.types.includes(dataset.type)

      // Source filter (dataset.portal?.name, falling back to publisher)
      const datasetSource = dataset.portal?.name ?? dataset.publisher
      const matchesSource
        = appliedFilters.sources.length === 0
          || (datasetSource ? appliedFilters.sources.includes(datasetSource) : false)

      return matchesSubdivision && matchesMunicipality && matchesType && matchesSource
    })
  }, [currentTabDatasets, searchTerm, appliedFilters])

  const sortedFilteredData = React.useMemo(() => {
    // Remove duplicates by name
    const uniqueByName = new Map<string, Dataset>()
    for (const ds of filteredData) {
      const name = ds.name?.toLowerCase() || ''
      if (!uniqueByName.has(name)) {
        uniqueByName.set(name, ds)
      }
    }

    // Filter out unwanted names/types
    const filtered = [...uniqueByName.values()].filter((ds) => {
      const name = ds.name?.toLowerCase() || ''
      const type = ds.type?.toLowerCase() || ''
      return !name.includes('basemap') && !type.includes('geocoding')
    })

    // HARD CODE BLOCK LIST
    const blocklisted = (ds: Dataset) => {
      const url = (ds.url || '').toLowerCase()
      const name = (ds.name || '').toLowerCase()
      return (
        url.includes('/2021_statistics_canada_boundaries/featureserver')
        || name.includes('2021 statistics canada boundaries')
        || url.includes('/limites_du_recensement_de_statistique_canada_(2021)/featureserver')
        || name.includes('limites du recensement de statistique canada (2021)')
      )
    }

    const safe = filtered.filter(ds => !blocklisted(ds))

    // Sort by name
    return safe.sort((a, b) =>
      (a.name || '').localeCompare(b.name || ''),
    )
  }, [filteredData])

  const { prefetch } = useFastDatasetCache()

  React.useEffect(() => {
    if (isOpen && sortedFilteredData.length > 0) {
      const datasetsToPreload = sortedFilteredData.slice(0, 10)
      datasetsToPreload.forEach((dataset, index) => {
        setTimeout(() => {
          prefetch(dataset)
        }, index * 200)
      })
    }
  }, [isOpen, sortedFilteredData, prefetch])

  // Handlers
  const handleTabChange = React.useCallback((value: string) => setCurrentTab(value), [])
  const handleRowClick = React.useCallback((dataset: Dataset) => {
    setSelectedDataset(dataset)
    setView('detail')
  }, [])
  const handleRowHover = React.useCallback((dataset: Dataset) => {
    prefetch(dataset)
    
    const currentIndex = sortedFilteredData.indexOf(dataset)
    if (currentIndex >= 0 && currentIndex < sortedFilteredData.length - 2) {
      setTimeout(() => {
        if (sortedFilteredData[currentIndex + 1]) {
          prefetch(sortedFilteredData[currentIndex + 1])
        }
      }, 100)
    }
  }, [prefetch, sortedFilteredData])
  const handleBackToTable = React.useCallback(() => {
    setView('table')
    setSelectedDataset(null)
  }, [])
  const handleAddDatasetToMap = React.useCallback(() => {
    if (selectedDataset) {
      datasetDispatch({ type: 'ADD_DATASET_TO_MAP', payload: { dataset: selectedDataset } })
    }
  }, [selectedDataset, datasetDispatch])
  const handleRemoveDatasetFromMap = React.useCallback(() => {
    if (selectedDataset) {
      datasetDispatch({ type: 'REMOVE_DATASET_FROM_MAP', payload: { datasetId: selectedDataset.id } })
    }
  }, [selectedDataset, datasetDispatch])
  const handleFavourite = handleFavouriteDataset(selectedDataset, favouriteDatasets, setFavouriteDatasets)

  const handleAddDataset = () => {
    // Logic to add a new dataset
  }

  // UI
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpenAction}>
      <DialogContent className="h-screen sm:h-[90vh] sm:max-h-[90vh] w-full max-w-full sm:w-[88vw] sm:max-w-[88vw] p-0 gap-0 overflow-hidden flex flex-col">
        {view === 'table' ? (
          <>
            <DialogHeader className="bg-background z-50 sticky top-0 p-6 flex flex-row flex-wrap justify-between items-end gap-2 text-left">
              <div className="flex flex-col justify-end p-0">
                <DialogTitle className="text-2xl">{t('dialogTitle')}</DialogTitle>
                <DialogDescription className="text-sm">
                  {t('dialogDescription')}
                </DialogDescription>
              </div>
              <div className="flex flex-row flex-wrap justify-between items-center">
                <div className="flex flex-wrap gap-2 font-medium">
                  <div className="relative">
                    <LR.Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search"
                      className="pl-8 w-[250px]"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      disabled={!ability.can('read', 'File')}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Filters
                      datasets={currentTabDatasets}
                      appliedFilters={appliedFilters}
                      onFiltersChange={setAppliedFilters}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddPortalOpen(true)}
                      title="Register a new open data portal"
                    >
                      <LR.Plus className="h-4 w-4 mr-1" />
                      Add Portal
                    </Button>
                  </div>
                </div>
              </div>
              <DialogClose className="absolute right-2 top-2 h-5 w-5 rounded-xl text-muted-foreground hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary">
                <LR.X className="!h-4 !w-4" />
              </DialogClose>
            </DialogHeader>
            <div className="relative flex flex-col flex-1 min-h-0">
              <Tabs value={currentTab} className="flex flex-col gap-0 h-full" onValueChange={handleTabChange}>
                <div className="hidden md:!flex justify-between px-3 flex-shrink-0">
                  {' '}
                  {/* Prevent tabs from shrinking */}
                  <TabsList className="pointer-events-auto sticky flex z-40 top-[100px] bg-transparent">
                    <TabsTrigger className="hover:text-foreground gap-2" value="applied">
                      <Badge variant="outline">{addedDatasets.length}</Badge>
                      {t('appliedTab')}
                    </TabsTrigger>
                    <TabsTrigger className="hover:text-foreground gap-2" value="favourites">
                      {t('favoritesTab')}
                    </TabsTrigger>
                    <TabsTrigger className="hover:text-foreground" value="organizational">{t('organizationalTab')}</TabsTrigger>
                    <TabsTrigger className="hover:text-foreground" value="all">{t('allDataTab')}</TabsTrigger>
                    <TabsTrigger className="hover:text-foreground" value="national">{t('nationalTab')}</TabsTrigger>
                    <TabsTrigger className="hover:text-foreground" value="countrySubdivision">{t('countrySubdivisionTab')}</TabsTrigger>
                    {showMunicipalTab && (
                      <TabsTrigger className="hover:text-foreground" value="municipal">{t('municipalTab')}</TabsTrigger>
                    )}
                    <TabsTrigger className="hover:text-foreground" value="liveData">{t('liveDataTab')}</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent
                  value={currentTab}
                  className="flex-1 pointer-events-auto mt-0 min-h-0" // min-h-0 is crucial for flex children
                >
                  {currentTabLoading ? (
                    <DatasetSkeleton />
                  ) : (datasetsError ? (
                    <div className="flex flex-col justify-center items-center h-32 text-muted-foreground">
                      <LR.AlertCircle className="h-6 w-6 mb-2" />
                      <span>{datasetsError}</span>
                      <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-2">
                        <LR.RefreshCw className="h-4 w-4 mr-2" />
                        {t('refreshButton')}
                      </Button>
                    </div>
                  ) : (
                    <DataTable
                      showPagination={true}
                      columns={datasetColumns}
                      data={sortedFilteredData}
                      tab={currentTab}
                      onRowClick={handleRowClick}
                      onRowHover={handleRowHover}
                      className="rounded-none w-auto h-full" 
                      paginationClasses="bg-background z-20 w-full border-t" 
                      isLoading={currentTabLoading}
                      leadingCell={props => (
                        <RowActions
                          {...props}
                          favouriteDatasets={favouriteDatasets}
                          setFavouriteDatasets={setFavouriteDatasets}
                        />
                      )}
                      trailingCell={({ row, index }) => (
                        <div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="pointer-events-none"
                          >
                            <LR.ChevronRight />
                          </Button>
                        </div>
                      )}
                    />
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
        // Detail View Content
          <>
            <DialogHeader className="px-6 pt-6">
              <div>
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        href="#"
                        onClick={() => {
                          handleBackToTable()
                          setCurrentTab('all')
                        }}
                      >
                        {t('breadcrumbTitle')}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        href="#"
                        onClick={() => {
                          setCurrentTab(currentTab)
                          handleBackToTable()
                        }}
                      >
                        {currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{selectedDataset?.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <div className="flex flex-row justify-between">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent ${selectedDataset && favouriteDatasets.includes(selectedDataset) ? 'opacity-100' : ''}`}
                    onClick={handleFavourite}
                  >
                    <LR.Star
                      className="!h-5 !w-5"
                      size={24}
                      color={`${selectedDataset && favouriteDatasets.includes(selectedDataset) ? 'hsl(var(--chart-5))' : 'black'} `}
                      fill={`${selectedDataset && favouriteDatasets.includes(selectedDataset) ? 'hsl(var(--chart-5))' : 'none'} `}
                    />
                  </Button>
                  <DialogTitle>{selectedDataset?.name}</DialogTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleBackToTable}
                  >
                    <LR.ArrowLeft />
                    {t('backToDataButton')}
                  </Button>
                  {selectedDataset && addedDatasets.some(d => d.name === selectedDataset.name)
                    ? (
                        <Button onClick={handleRemoveDatasetFromMap} disabled={!ability.can('read', 'File')}>
                          <LR.Minus />
                          {t('removeButton')}
                        </Button>
                      )
                    : (
                        <Button onClick={handleAddDatasetToMap} disabled={!ability.can('read', 'File')}>
                          <LR.Plus />
                          {t('applyButton')}
                        </Button>
                      )}
                </div>
              </div>
            </DialogHeader>
            <DatasetDetails selectedDataset={selectedDataset} />
          </>
        )}
      </DialogContent>
      <AddPortalDialog open={isAddPortalOpen} onOpenChange={setIsAddPortalOpen} />
    </Dialog>
  )
}
