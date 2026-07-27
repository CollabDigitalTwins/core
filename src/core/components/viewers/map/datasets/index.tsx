'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Icons
import * as LR from 'lucide-react'
// Dependencies
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import * as  React from 'react'


// import { useAppConfigContext } from '../../../../store/AppConfig/context'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/Select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/Tabs'
import { useOpenDataPortalsByCountrySubdivision, useOpenDataPortalsByGroup, useOpenDataPortalsByMunicipality } from '../../../../hooks/openDataPortals/openDataPortals'
import { DatasetsContext, MenusContext, useMapContext } from '../../../../store'
import { usePermissions } from '../../../../store'

// Data
import { DatasetGroup } from '../../../../types/dbTypes'

import { AddPortalDialog } from './AddPortalDialog'
import { useColumns } from './data'
import DatasetDetails from './DatasetDetails'
// Custom components
import DatasetSkeleton from './DatasetSkeleton'
import Filters from './Filters'
import RowActions from './RowActions'
import { builtinLiveDatasets } from './src/builtinLiveDatasets'
import { fetchLocalDatasets } from './src/localDatasets'
import { fetchOrganizationalMinioDatasets } from './src/minioDatasets'
import { buildPublishedCatalogMap, stampPublished, type PublishedCatalogEntry } from './src/publishedTiles'
import { useDatasetsForPortals } from './src/useDatasetsForPortals'
import { useFastDatasetCache } from './src/useFastDatasetCache'
import { handleFavouriteDataset } from './utils'

import type { Dataset } from '../../../../types/datasetTypes'
import type { Organization } from '../../../../types/dbTypes';

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
  organization?: Organization
  minioBaseUrl?: string
  martinBaseUrl?: string
}

export default function Datasets({ isOpen, setIsOpenAction, organization, minioBaseUrl, martinBaseUrl }: DatasetsProps) {
  // Translation
  const t = useTranslations('Datasets')

  // Permissions
  const { ability } = usePermissions()

  const datasetColumns = useColumns()

  // Contexts
  const { state: mapState } = useMapContext()
  const { currentLocation } = mapState.map
  const orgCountry = (organization?.country || '').toUpperCase()
  const org = organization
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
  // Open-data datasets already published to Martin tiles, keyed by
  // "{portalId}:{datasetId}". Lets the original portal entry (National/Applied/
  // All tabs) show as converted, not just the organizational-list copy.
  const [publishedCatalog, setPublishedCatalog] = React.useState<Map<string, PublishedCatalogEntry>>(new Map())
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
      // First, refresh the published-catalog lookup (a fast /api/files read) so
      // converted open-data datasets flip promptly across every tab — ahead of
      // the slower Martin tile-sampling below. Non-fatal on failure.
      try {
        const filesRes = await fetch('/api/files')
        if (filesRes.ok) {
          const body = await filesRes.json()
          const rows = Array.isArray(body?.files) ? body.files : []
          setPublishedCatalog(buildPublishedCatalogMap(rows))
        }
      }
      catch (err) {
        console.warn('Failed to refresh published-catalog map:', err)
      }

      // Two parallel sources: Martin vector tiles (if configured) and MinIO-
      // backed GeoJSON uploads (the "Add Dataset" path). Errors from either
      // are isolated so a failure on one side does not block the other.
      const martinBaseUrlClean = (martinBaseUrl ?? '').replace(/\/+$/, '')

      const martinPromise: Promise<Dataset[]> = martinBaseUrlClean
        ? (async () => {
            const datasetsUrl = martinBaseUrlClean.includes('/tiles/index.json')
              ? martinBaseUrlClean
              : `${martinBaseUrlClean}/tiles/index.json`

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

      if (!martinBaseUrlClean) {
        console.warn('NEXT_PUBLIC_MARTIN_SERVER_URL not configured — skipping Martin pre-load')
      }

      // The MinIO key prefix is the *session* organization (set server-side
      // by the upload route), not orgVisibility.currentOrgId (which is
      // path-derived and hardcoded for admin routes like /cdt).
      const sessionOrgId = typeof org?.id === 'number'
        ? org.id
        : Number.parseInt(String(org?.id ?? ''), 10)

      // Martin must resolve first so MinIO suppression can check live catalog
      // membership — prevents "file disappeared" during the publish→restart gap.
      const martinDatasets = await martinPromise
      const publishedTilesInCatalog = new Set<string>(
        martinDatasets.map(d => typeof d.id === 'string' ? d.id : '').filter(Boolean),
      )

      const minioDatasets: Dataset[] = Number.isFinite(sessionOrgId)
        ? await fetchOrganizationalMinioDatasets(sessionOrgId, publishedTilesInCatalog, minioBaseUrl).catch((err) => {
            console.error('Failed to load MinIO organizational datasets:', err)
            return []
          })
        : []

      const combined = [...martinDatasets, ...minioDatasets]
      const visibleOrgDatasets = combined.filter(ds => datasetVisibleForOrg(ds, orgVisibility))

      if (visibleOrgDatasets.length === 0) {
        console.warn('No organizational datasets found')
      }
      datasetDispatch({
        type: 'SET_DATASETS',
        payload: { datasets: visibleOrgDatasets },
      })
    }

    void loadOrganizationalDatasets()
  }, [datasetDispatch, orgVisibility, org?.id, datasetState.datasets.orgRefreshNonce])

  // Stamp each portal list with published-tile identity so a converted open-data
  // dataset shows as converted on its own tab (National/Subdivision/Municipal),
  // not only on the organizational tab. No-op for unpublished datasets.
  const nationalDatasets = React.useMemo(() => stampPublished(national.datasets, publishedCatalog), [national.datasets, publishedCatalog])
  const subdivisionDatasets = React.useMemo(() => stampPublished(subdivision.datasets, publishedCatalog), [subdivision.datasets, publishedCatalog])
  const municipalDatasets = React.useMemo(() => stampPublished(municipal.datasets, publishedCatalog), [municipal.datasets, publishedCatalog])

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
      ...builtinLiveDatasets, // curated live feeds (e.g. GeoMet weather radar) → Live Data tab
      ...nationalDatasets,
      ...subdivisionDatasets,
      ...municipalDatasets,
      ...addedDatasets,
      ...(datasetState.datasets.datasets || []),
    ]

    const filtered = unfiltered.filter(ds => datasetVisibleForOrg(ds, orgVisibility))

    // Also stamp here so the addedDatasets snapshot (applied at add-time, before
    // conversion) and any org-list entries pick up published identity on the
    // Applied/All tabs. Already-stamped portal entries are unchanged.
    return stampPublished(filtered, publishedCatalog)
  }, [nationalDatasets, subdivisionDatasets, municipalDatasets, datasetState.datasets.datasets, addedDatasets, orgVisibility, publishedCatalog])

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
            <DialogHeader className="bg-background z-50 sticky top-0 p-4 sm:p-6 flex flex-row flex-wrap justify-between items-end gap-2 text-left">
              <div className="flex flex-col justify-end p-0">
                <DialogTitle className="text-2xl">{t('dialogTitle')}</DialogTitle>
                <DialogDescription className="text-sm">
                  {t('dialogDescription')}
                </DialogDescription>
              </div>
              <div className="flex flex-row flex-wrap justify-between items-center w-full sm:w-auto">
                <div className="flex flex-wrap gap-2 font-medium w-full sm:w-auto">
                  <div className="relative flex-1 min-w-[140px] sm:flex-none">
                    <LR.Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search"
                      className="pl-8 w-full sm:w-[250px]"
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
                {/* Mobile: TabsList below doesn't wrap and has no room to render below md,
                    so it's replaced with a Select driving the same currentTab state. */}
                <div className="md:hidden px-3 pb-2 flex-shrink-0">
                  <Select value={currentTab} onValueChange={handleTabChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="applied">{t('appliedTab')} ({addedDatasets.length})</SelectItem>
                      <SelectItem value="favourites">{t('favoritesTab')}</SelectItem>
                      <SelectItem value="organizational">{t('organizationalTab')}</SelectItem>
                      <SelectItem value="all">{t('allDataTab')}</SelectItem>
                      <SelectItem value="national">{t('nationalTab')}</SelectItem>
                      <SelectItem value="countrySubdivision">{t('countrySubdivisionTab')}</SelectItem>
                      {showMunicipalTab && (
                        <SelectItem value="municipal">{t('municipalTab')}</SelectItem>
                      )}
                      <SelectItem value="liveData">{t('liveDataTab')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                          martinBaseUrl={martinBaseUrl}
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
              <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                <div className="flex items-center min-w-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`shrink-0 opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent ${selectedDataset && favouriteDatasets.includes(selectedDataset) ? 'opacity-100' : ''}`}
                    onClick={handleFavourite}
                  >
                    <LR.Star
                      className="!h-5 !w-5"
                      size={24}
                      color={`${selectedDataset && favouriteDatasets.includes(selectedDataset) ? 'hsl(var(--chart-5))' : 'black'} `}
                      fill={`${selectedDataset && favouriteDatasets.includes(selectedDataset) ? 'hsl(var(--chart-5))' : 'none'} `}
                    />
                  </Button>
                  <DialogTitle className="truncate">{selectedDataset?.name}</DialogTitle>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
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
