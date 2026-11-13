// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'

import { buildingDisplayName } from '../../../../utils/buildingDisplayName'

import type { Building, Infrastructure, Site } from '../../../../types/dbTypes'

type ReferenceKind = 'site' | 'building' | 'infrastructure' | 'fileType'

const REFERENCE_FIELDS: Record<string, ReferenceKind> = {
  buildingParentSiteId: 'site',
  infrastructureParentSiteId: 'site',
  site: 'site',
  building: 'building',
  infrastructure: 'infrastructure',
  fileType: 'fileType',
}

type Collections = {
  buildings?: Building[]
  sites?: Site[]
  infrastructures?: Infrastructure[]
}

/** Human-readable field and value labels for active-filter chips; ids resolve to names. */
export function useFilterChipLabels({ buildings, sites, infrastructures }: Collections) {
  const t = useTranslations('HeaderButtons')
  const tColumns = useTranslations('DataMenuColumns')

  const fieldLabel = (field: string) => {
    const reference = REFERENCE_FIELDS[field]
    if (reference) return t(reference)
    const key = `filterFields.${field}`
    return tColumns.has(key) ? tColumns(key) : field
  }

  const valueLabel = (field: string, value: string) => {
    switch (REFERENCE_FIELDS[field]) {
      case 'site': {
        return sites?.find(site => String(site.id) === value)?.siteName || value
      }
      case 'building': {
        return buildingDisplayName(buildings?.find(item => String(item.id) === value)) ?? value
      }
      case 'infrastructure': {
        return infrastructures?.find(item => String(item.id) === value)?.infrastructureName || value
      }
      default: {
        return value
      }
    }
  }

  return { fieldLabel, valueLabel }
}
