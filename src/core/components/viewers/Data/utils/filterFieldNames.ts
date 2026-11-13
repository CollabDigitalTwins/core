// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

type FilterFieldNames = {
  municipality?: string
  countrySubdivision?: string
  building?: string
  site?: string
  infrastructure?: string
}

const FILTER_FIELD_NAMES: Record<string, FilterFieldNames> = {
  buildings: {
    municipality: 'buildingMunicipality',
    countrySubdivision: 'buildingCountrySubdivision',
    site: 'buildingParentSiteId',
  },
  sites: {
    municipality: 'siteMunicipality',
    countrySubdivision: 'siteCountrySubdivision',
  },
  infrastructure: {
    municipality: 'infrastructureMunicipality',
    countrySubdivision: 'infrastructureCountrySubdivision',
    site: 'infrastructureParentSiteId',
  },
  files: {
    building: 'building',
    site: 'site',
    infrastructure: 'infrastructure',
  },
}

/** The data fields each viewer's quick-filter buttons filter on; empty for viewers without filters. */
export const getFilterFieldNames = (viewer: string): FilterFieldNames => FILTER_FIELD_NAMES[viewer] ?? {}

/** Whether `FilterButtons` renders anything for this viewer. */
export const hasFilterButtons = (viewer: string) => Object.hasOwn(FILTER_FIELD_NAMES, viewer)
