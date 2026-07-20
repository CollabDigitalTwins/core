// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useMemo } from 'react'

import { ViewerNames } from '../../../../types/dbTypes'

import { filterHelper, getNarrowedFilterOptions, getUniqueColumnValues } from './filterHelper'
import { formatPosition } from './positionParser'

import type { Building, Infrastructure, Site, User, DbFile } from '../../../../types/dbTypes'
import type { FileRow } from '../../../../types/files'
import type { FilterState } from '../../../../types/global'


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseViewerDataParams {
  currentViewer: ViewerNames
  buildings: Building[] | undefined
  sites: Site[] | undefined
  infrastructures: Infrastructure[] | undefined
  files: {
    id: number | string
    name: string
    attachedFilesBuildingId?: number | null
    uploadedAt: string | Date
    extension?: string | null
    sizeBytes: number
    position?: unknown
  }[] | undefined
  users: Partial<User>[] | undefined
  /** Loading flags from each data hook */
  loadingFlags: {
    buildings: boolean
    sites: boolean
    infrastructures: boolean
    files: boolean
    users: boolean
  }
  searchTerm: string
  activeFilters: FilterState[]
  /** Raw filter state (used by getNarrowedFilterOptions) */
  filters: FilterState[]
  /** Current user email */
  userEmail: string
}

interface UseViewerDataResult {
  data: Building[] | Site[] | Infrastructure[] | FileRow[] | Partial<User>[]
  filteredData: Building[] | Site[] | Infrastructure[] | FileRow[] | Partial<User>[]
  filtersOptions: ReturnType<typeof getNarrowedFilterOptions>
  isLoading: boolean
}

// ---------------------------------------------------------------------------
// Search helpers
// ---------------------------------------------------------------------------

function matchesSearch(value: unknown, term: string): boolean {
  return String(value).toLowerCase().includes(term.toLowerCase())
}

function searchFields(fields: unknown[], term: string): boolean {
  return fields.some(v => matchesSearch(v, term))
}

function searchAllValues(obj: object, term: string): boolean {
  return Object.values(obj).some(v => matchesSearch(v, term))
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useViewerData({
  currentViewer,
  buildings,
  sites,
  infrastructures,
  files,
  users,
  loadingFlags,
  searchTerm,
  activeFilters,
  filters,
  userEmail,
}: UseViewerDataParams): UseViewerDataResult {

  // Memoize the mapped FileRow array independently so the files case below
  // doesn't re-derive it on every render unrelated to files data changing.
  const mappedFiles: FileRow[] = useMemo(() => {
    if (!files) return []
    return files.map(file => ({
      id: String(file.id),
      name: file.name,
      attachedTo: [
        { type: 'building' as const, buildingId: String(file.attachedFilesBuildingId || '') },
      ],
      dateUploaded: file.uploadedAt,
      uploadedBy: userEmail || 'Unknown',
      fileType: file.extension?.toUpperCase() || '',
      fileSize: `${(file.sizeBytes / (1024 * 1024)).toFixed(3)} MB`,
      position: formatPosition(file.position as string),
      metadata: file as unknown as DbFile,
    }))
  }, [files, userEmail])

  return useMemo((): UseViewerDataResult => {
    switch (currentViewer) {
      // -----------------------------------------------------------------------
      case ViewerNames.buildings: {
        const data = buildings || []
        const searched = data.filter(b =>
          searchFields([
            b.buildingName,
            b.buildingCountrySubdivision,
            b.buildingMunicipality,
            b.buildingType,
            b.buildingAddress,
          ], searchTerm),
        )
        const filteredData = filterHelper(searched, activeFilters)
        const filtersOptions = getNarrowedFilterOptions(data, [], filters)

        return {
          data,
          filteredData,
          filtersOptions,
          isLoading: loadingFlags.buildings,
        }
      }

      // -----------------------------------------------------------------------
      case ViewerNames.sites: {
        const data = sites || []
        const searched = data.filter(s => searchAllValues(s, searchTerm))
        const filteredData = filterHelper(searched, activeFilters)
        const filtersOptions = getNarrowedFilterOptions(data, [], filters)

        return {
          data,
          filteredData,
          filtersOptions,
          isLoading: loadingFlags.sites,
        }
      }

      // -----------------------------------------------------------------------
      case ViewerNames.infrastructure: {
        const data = infrastructures || []
        const searched = data.filter((infra: Infrastructure) =>
          searchFields([
            infra.infrastructureName,
            infra.infrastructureType,
            infra.infrastructureCountrySubdivision,
            infra.infrastructureMunicipality,
          ], searchTerm),
        )
        const filteredData = filterHelper(searched, activeFilters)
        const filtersOptions = getNarrowedFilterOptions(data, [], filters)

        return {
          data,
          filteredData,
          filtersOptions,
          isLoading: loadingFlags.infrastructures,
        }
      }

      // -----------------------------------------------------------------------
      case ViewerNames.files: {
        const data = mappedFiles.filter(file => file.metadata.tag?.toLowerCase() !== 'user')
        const searched = data.filter(f => searchAllValues(f, searchTerm))
        const filteredData = filterHelper(searched, activeFilters)

        const baseFilterOptions = [
          {
            id: 'name',
            label: 'Name',
            type: 'string',
            valueOptions: getUniqueColumnValues(data, 'name'),
          },
          {
            id: 'dateUploaded',
            label: 'Date Uploaded',
            type: 'date',
            valueOptions: getUniqueColumnValues(data, 'dateUploaded'),
          },
          {
            id: 'fileType',
            label: 'File Type',
            type: 'string',
            valueOptions: getUniqueColumnValues(data, 'fileType'),
          },
          {
            id: 'fileSize',
            label: 'File Size',
            type: 'string',
            valueOptions: getUniqueColumnValues(data, 'fileSize'),
          },
          {
            id: 'uploadedBy',
            label: 'Uploaded By',
            type: 'string',
            valueOptions: getUniqueColumnValues(data, 'uploadedBy'),
          },
        ]

        const filtersOptions = getNarrowedFilterOptions(data, baseFilterOptions, filters)

        return {
          data,
          filteredData,
          filtersOptions,
          isLoading: loadingFlags.files,
        }
      }

      // -----------------------------------------------------------------------
      case ViewerNames.users: {
        const data = users || []
        const searched = data.filter(u =>
          searchFields([u.name, u.email, u.organizationId], searchTerm),
        )
        const filteredData = filterHelper(searched, activeFilters)
        const filtersOptions = getNarrowedFilterOptions(data, [], filters)

        return {
          data,
          filteredData,
          filtersOptions,
          isLoading: loadingFlags.users,
        }
      }

      // -----------------------------------------------------------------------
      default:
        return {
          data: [],
          filteredData: [],
          filtersOptions: [],
          isLoading: false,
        }
    }
  }, [
    currentViewer,
    buildings,
    sites,
    infrastructures,
    mappedFiles,
    users,
    loadingFlags,
    searchTerm,
    activeFilters,
    filters,
  ])
}