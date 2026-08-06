'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePathname } from 'next/navigation'
import * as React from 'react'

// import { useAppConfigContext } from '../../../../../../../store/AppConfig/context'
import {
  useOpenDataPortalsByCountrySubdivision,
  useOpenDataPortalsByGroup,
  useOpenDataPortalsByMunicipality,
} from '../../../../../../../hooks/openDataPortals/openDataPortals'
import { DatasetsContext, MenusContext, useMapContext } from '../../../../../../../store'
import { DatasetGroup } from '../../../../../../../types/dbTypes'
import { ViewerSidebarPanel } from '../../../../../../ui/ViewerSidebar/Panel'
import { fetchLocalDatasets } from '../../../../datasets/src/localDatasets'
import { useDatasetsForPortals } from '../../../../datasets/src/useDatasetsForPortals'

import { AppliedDatasetsSection } from './src/AppliedDatasetsSection'
import { AvailableDatasetsSection } from './src/AvailableDatasetsSection'

import type { Dataset } from '../../../../../../../types/datasetTypes'
import type { Organization } from '../../../../../../../types/dbTypes';

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
    return { isAdmin: true, currentOrgId: 1, allowedOrgIds: ADMIN_ALLOWED_ORGS }
  }

  const currentOrgId = ORG_BY_PATH_PREFIX[prefix] ?? 2
  return { isAdmin: false, currentOrgId, allowedOrgIds: Array.from(new Set([2, currentOrgId])) }
}

function datasetVisibleForOrg(dataset: Dataset, visibility: OrgVisibility) {
  if (visibility.isAdmin) return true
  if (dataset.group !== DatasetGroup.Organizational) return true
  const orgId = normalizeOrgId(dataset.organization)
  if (orgId === undefined) return false
  return visibility.allowedOrgIds.includes(orgId)
}

const BLOCKLIST_URLS = [
  '/2021_statistics_canada_boundaries/featureserver',
  '/limites_du_recensement_de_statistique_canada_(2021)/featureserver',
]
const BLOCKLIST_NAMES = [
  '2021 statistics canada boundaries',
  'limites du recensement de statistique canada (2021)',
]

function isBlocklisted(ds: Dataset) {
  const url = (ds.url || '').toLowerCase()
  const name = (ds.name || '').toLowerCase()
  return BLOCKLIST_URLS.some(u => url.includes(u)) || BLOCKLIST_NAMES.some(n => name.includes(n))
}

function sanitizeDatasets(list: Dataset[]) {
  const uniqueByName = new Map<string, Dataset>()
  for (const ds of list) {
    const name = ds.name?.toLowerCase() || ''
    if (!uniqueByName.has(name)) uniqueByName.set(name, ds)
  }
  const filtered = [...uniqueByName.values()].filter((ds) => {
    const name = ds.name?.toLowerCase() || ''
    const type = ds.type?.toLowerCase() || ''
    return !name.includes('basemap') && !type.includes('geocoding') && !isBlocklisted(ds)
  })
  return filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

export function LayersTab({ martinBaseUrl, organization }: { martinBaseUrl?: string; organization?: Organization }) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [favourites, setFavourites] = React.useState<Dataset[]>([])

  const { state: mapState } = useMapContext()
  const { currentLocation } = mapState.map
  const org = organization
  const orgCountry = (org?.country || '').toUpperCase()

  const municipality = currentLocation?.municipality ?? org?.municipality ?? null
  const countrySubdivision = currentLocation?.countrySubdivision ?? org?.countrySubdivision ?? null

  const { state: datasetState, dispatch: datasetDispatch } = React.useContext(DatasetsContext)
  const { state: menusState } = React.useContext(MenusContext)
  const { rowsPerPage } = menusState.menus

  const pathname = usePathname()
  const orgVisibility = React.useMemo(() => getOrgVisibilityFromPath(pathname), [pathname])

  const { openDataPortals: municipalPortals } = useOpenDataPortalsByMunicipality(municipality)
  const { openDataPortals: subdivisionPortals } = useOpenDataPortalsByCountrySubdivision(countrySubdivision)
  const { openDataPortals: nationalPortals } = useOpenDataPortalsByGroup(DatasetGroup.National)

  const matchesOrgCountry = React.useCallback(
    (portalCountry: string | null | undefined) => {
      if (!orgCountry) return true
      if (!portalCountry) return true
      return portalCountry.toUpperCase() === orgCountry
    },
    [orgCountry],
  )

  const filteredMunicipalPortals = React.useMemo(
    () => (Array.isArray(municipalPortals) ? municipalPortals.filter(p => matchesOrgCountry(p.country)) : []),
    [municipalPortals, matchesOrgCountry],
  )
  const filteredSubdivisionPortals = React.useMemo(
    () => (Array.isArray(subdivisionPortals)
      ? subdivisionPortals.filter(p => p.municipality == null && matchesOrgCountry(p.country))
      : []),
    [subdivisionPortals, matchesOrgCountry],
  )
  const filteredNationalPortals = React.useMemo(
    () => (Array.isArray(nationalPortals) ? nationalPortals.filter(p => matchesOrgCountry(p.country)) : []),
    [nationalPortals, matchesOrgCountry],
  )

  const municipal = useDatasetsForPortals(filteredMunicipalPortals, { rowsPerPage })
  const subdivision = useDatasetsForPortals(filteredSubdivisionPortals, { rowsPerPage })
  const national = useDatasetsForPortals(filteredNationalPortals, { rowsPerPage })

  React.useEffect(() => {
    const loadOrganizationalDatasets = async () => {
      try {
        const martinBaseUrlClean = (martinBaseUrl ?? '').replace(/\/+$/, '')
        if (!martinBaseUrlClean) return

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

        const organizationalDatasets = await fetchLocalDatasets(localPortal as any)
        const visible = organizationalDatasets.filter(ds => datasetVisibleForOrg(ds, orgVisibility))
        if (visible.length > 0) {
          datasetDispatch({ type: 'SET_DATASETS', payload: { datasets: visible } })
        }
      }
      catch (error) {
        console.error('Failed to load organizational datasets:', error)
      }
    }
    void loadOrganizationalDatasets()
  }, [datasetDispatch, orgVisibility])

  const nationalDatasets = React.useMemo(
    () => sanitizeDatasets(national.datasets.filter(ds => datasetVisibleForOrg(ds, orgVisibility))),
    [national.datasets, orgVisibility],
  )
  const subdivisionDatasets = React.useMemo(
    () => sanitizeDatasets(subdivision.datasets.filter(ds => datasetVisibleForOrg(ds, orgVisibility))),
    [subdivision.datasets, orgVisibility],
  )
  const municipalDatasets = React.useMemo(
    () => sanitizeDatasets(municipal.datasets.filter(ds => datasetVisibleForOrg(ds, orgVisibility))),
    [municipal.datasets, orgVisibility],
  )
  const orgDatasets = React.useMemo(
    () => sanitizeDatasets((datasetState.datasets.datasets || []).filter(ds => datasetVisibleForOrg(ds, orgVisibility))),
    [datasetState.datasets.datasets, orgVisibility],
  )

  const allDatasets = React.useMemo(() => {
    const combined = [...nationalDatasets, ...subdivisionDatasets, ...municipalDatasets, ...orgDatasets]
    return sanitizeDatasets(combined)
  }, [nationalDatasets, subdivisionDatasets, municipalDatasets, orgDatasets])

  const liveDatasets = React.useMemo(
    () => allDatasets.filter(ds => ds.portal?.live === true),
    [allDatasets],
  )

  const toggleFavourite = React.useCallback((dataset: Dataset) => {
    setFavourites(prev => (
      prev.some(f => f.name === dataset.name)
        ? prev.filter(f => f.name !== dataset.name)
        : [...prev, dataset]
    ))
  }, [])

  const showMunicipal = Boolean(municipality)

  return (
    <ViewerSidebarPanel
      className="space-y-4"
      search={{ value: searchQuery, onChange: setSearchQuery }}
    >
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 divide-y">
        <div className="pb-2">
          <AppliedDatasetsSection />
        </div>
        <div className="pt-2">
          <AvailableDatasetsSection
            query={searchQuery}
            allDatasets={allDatasets}
            nationalDatasets={nationalDatasets}
            subdivisionDatasets={subdivisionDatasets}
            municipalDatasets={municipalDatasets}
            organizationalDatasets={orgDatasets}
            liveDatasets={liveDatasets}
            showMunicipal={showMunicipal}
            favourites={favourites}
            onFavouriteToggle={toggleFavourite}
          />
        </div>
      </div>
    </ViewerSidebarPanel>
  )
}
