'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { MenusContext } from '../../../../store'
import { useSession } from 'next-auth/react'

// Shadcn Components
import { Button } from '../../../ui/Button'
import { Avatar, AvatarFallback, AvatarImage } from '../../../ui/Avatar'
import { Badge } from '../../../ui/Badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/Select'

// Icons
import * as LR from 'lucide-react'

// Utils
import { useUserRole } from '../../../../hooks/users/users'
import { UserAvatar } from '../../../ui/UserAvatar'
import { MapContext } from '../../../../store/Map/context'

import { useLocale, useTranslations } from 'next-intl'
import type { Building, DbFile, Infrastructure, Site, User } from '../../../../types/dbTypes'
import { RoleNames } from '../../../../types/global'

export interface ColumnMeta {
  columnClasses: string
}

export type BuildingDatumValue = {
  id: string
  buildingDatumId: string
  value: string
  date: string
}

export type FileAttachment
  = | { type: 'building', buildingId: string }
    | { type: 'site', siteId: string }
    | { type: 'infrastructure', infrastructureId: string }

export function useColumns(buildings?: Building[]): ColumnDef<Building | Site | Infrastructure | DbFile>[] {
  // Translations
  const t = useTranslations('DataMenuColumns')
  const locale = useLocale()

  const { currentViewer } = React.useContext(MenusContext).state.menus
  const { state: mapState } = React.useContext(MapContext)
  const countrySubdivisionsData = mapState.map.countrySubdivisionsData

  const getSubdivisionName = React.useCallback((code: string | undefined | null): string => {
    if (!code) return ''
    if (!countrySubdivisionsData) return code
    // Exact match (e.g. "CA-ON")
    const exact = countrySubdivisionsData[code] as any
    if (exact) return (exact?.name ?? exact) || code
    // Suffix match — handles short codes stored by the geocoder (e.g. "ON" → "CA-ON")
    const entry = Object.entries(countrySubdivisionsData).find(([k]) => k.endsWith(`-${code}`))
    if (entry) return ((entry[1] as any)?.name ?? entry[1]) || code
    return code
  }, [countrySubdivisionsData])

  // Helper to check for duplicate names in the current data
  const hasDuplicateName = React.useCallback(
    <T extends { buildingName?: string; infrastructureName?: string }>(data: T[], name: string) => {
      if (!name) return false
      const namesCount = data.filter(
        b =>
          (b.buildingName === name) ||
          (b.infrastructureName === name)
      ).length
      return namesCount > 1
    },
    []
  )

  // Define column configurations for each viewer type
  const buildingsColumns: ColumnDef<Building | Site | Infrastructure | DbFile>[] = [
    {
      accessorKey: 'buildingName',
      accessorFn: (row) => {
        // If buildingName exists and is not empty, use it; otherwise, use address
        if ('buildingName' in row && row.buildingName) {
          return row.buildingName
        }
        if ('buildingAddress' in row && row.buildingAddress) {
          return row.buildingAddress
        }
        return ''
      },
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('buildingNameAdd')}
            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      cell: ({ row, table }) => {
        const building = row.original as Building
        const buildingName = building.buildingName
        const buildingAddress = building.buildingAddress

        // Get all rows in the current page
        const currentPageData = table.getRowModel().rows.map(r => r.original as Building)

        // Check if this building name exists in the current page
        const isDuplicate = buildingName && hasDuplicateName(currentPageData, buildingName)

        if (!buildingName) {
          return buildingAddress || ''
        }

        if (isDuplicate) {
          return `${buildingName} - ${buildingAddress || ''}`
        }

        return buildingName
      },
      enableSorting: true,
      meta: { columnClasses: '' } as ColumnMeta,
    },
    {
      accessorKey: 'buildingCountrySubdivision',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('buildingCountrySubdivision')}
            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      cell: ({ getValue }) => getSubdivisionName(getValue() as string),
      enableSorting: true,
      meta: { columnClasses: '!hidden sm:!table-cell' } as ColumnMeta,
    },
    {
      accessorKey: 'buildingMunicipality',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('buildingMunic')}
            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      enableSorting: true,
      meta: { columnClasses: '!hidden sm:!table-cell' } as ColumnMeta,
    },
    {
      accessorKey: 'buildingType',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('buildingType')}
            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      enableSorting: true,
      meta: { columnClasses: '!hidden sm:!table-cell' } as ColumnMeta,
    },
  ]

  const sitesColumns: ColumnDef<Building | Site | DbFile>[] = [
    {
      accessorKey: 'siteName',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('siteName')}
            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      enableSorting: true,
      meta: { columnClasses: '' } as ColumnMeta,
    },
    {
      accessorKey: 'siteCountrySubdivision',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('siteCountrySubdivision')}
            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      cell: ({ getValue }) => getSubdivisionName(getValue() as string),
      enableSorting: true,
      meta: { columnClasses: '!hidden sm:!table-cell' } as ColumnMeta,
    },
    {
      accessorKey: 'siteMunicipality',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('siteMunic')}

            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      enableSorting: true,
      meta: { columnClasses: 'invisible absolute sm:visible sm:static sm:table-cell' } as ColumnMeta,
    },
  ]

  const infrastructureColumns: ColumnDef<Building | Site | Infrastructure | DbFile>[] = [
  {
    accessorKey: 'infrastructureName',
    accessorFn: (row) => {
      // Fallback logic: Name -> Address -> Empty String
      if ('infrastructureName' in row && row.infrastructureName) {
        return row.infrastructureName
      }
      if ('infrastructureAddress' in row && row.infrastructureAddress) {
        return row.infrastructureAddress
      }
      return ''
    },
    header: ({ column }) => {
      const isSorted = column.getIsSorted()
      return (
        <Button
          variant="ghost"
          onClick={column.getToggleSortingHandler()}
          className="hover:bg-transparent p-0"
        >
          {/* Note: Ensure 'infrastructureName' or similar is in your translation file */}
          {t('infrastructureName')}
          {isSorted == false && <LR.ArrowUpDown />}
          {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
          {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
        </Button>
      )
    },
    cell: ({ row, table }) => {
      const infra = row.original as Infrastructure
      const infraName = infra.infrastructureName
      const infraAddress = infra.infrastructureAddress

      // Get all rows in current page for duplicate checking
      const currentPageData = table.getRowModel().rows.map(r => r.original as Infrastructure)

      // Use the same helper function used in buildings for consistency
      const isDuplicate = infraName && hasDuplicateName(currentPageData, infraName)

      if (!infraName) {
        return infraAddress || ''
      }

      if (isDuplicate) {
        return `${infraName} - ${infraAddress || ''}`
      }

      return infraName
    },
    enableSorting: true,
    meta: { columnClasses: '' } as ColumnMeta,
  },
  {
    accessorKey: 'infrastructureCountrySubdivision',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()
      return (
        <Button
          variant="ghost"
          onClick={column.getToggleSortingHandler()}
          className="hover:bg-transparent p-0"
        >
          {t('infrastructureCountrySubdivision')}
          {isSorted == false && <LR.ArrowUpDown />}
          {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
          {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
        </Button>
      )
    },
    cell: ({ getValue }) => getSubdivisionName(getValue() as string),
    enableSorting: true,
    meta: { columnClasses: '!hidden sm:!table-cell' } as ColumnMeta,
  },
  {
    accessorKey: 'infrastructureMunicipality',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()
      return (
        <Button
          variant="ghost"
          onClick={column.getToggleSortingHandler()}
          className="hover:bg-transparent p-0"
        >
          {t('infrastructureMunic')}
          {isSorted == false && <LR.ArrowUpDown />}
          {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
          {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
        </Button>
      )
    },
    enableSorting: true,
    meta: { columnClasses: '!hidden sm:!table-cell' } as ColumnMeta,
  },
  {
    accessorKey: 'infrastructureType',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()
      return (
        <Button
          variant="ghost"
          onClick={column.getToggleSortingHandler()}
          className="hover:bg-transparent p-0"
        >
          {t('infrastructureType')}
          {isSorted == false && <LR.ArrowUpDown />}
          {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
          {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
        </Button>
      )
    },
    enableSorting: true,
    meta: { columnClasses: '!hidden sm:!table-cell' } as ColumnMeta,
  },
]

  const filesColumns: ColumnDef<Building | Site | DbFile>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('fileName')}
            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      enableSorting: true,
      meta: { columnClasses: '' } as ColumnMeta,
    },
    {
      accessorKey: 'site',
      accessorFn: (row) => {
        if ('attachedTo' in row && row.attachedTo) {
          const siteAttachments = (row.attachedTo as FileAttachment[]).filter(attachment => attachment.type === 'site')
          if (siteAttachments.length === 0) return ''
          if (siteAttachments.length === 1) return siteAttachments[0].siteId
          return `${siteAttachments[0].siteId} ${t('and')} ${siteAttachments.length - 1} ${t('fileMore')}`
        }
        return ''
      },
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('fileSite')}

            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      enableSorting: true,
      meta: { columnClasses: 'invisible absolute sm:visible sm:static sm:table-cell' } as ColumnMeta,
    },
    {
      accessorKey: 'building',
      accessorFn: (row) => {
        if ('attachedTo' in row && row.attachedTo) {
          const buildingAttachments = (row.attachedTo as FileAttachment[]).filter(attachment => attachment.type === 'building')
          if (buildingAttachments.length === 0) return ''

          const buildingRef = buildingAttachments[0].buildingId
          const foundBuilding = buildings?.find(b => String(b.id) === String(buildingRef))
          const displayName = foundBuilding?.buildingName || foundBuilding?.buildingAddress || buildingRef

          if (buildingAttachments.length === 1) return displayName
          return `${displayName} ${t('and')} ${buildingAttachments.length - 1} ${t('fileMore')}`
        }
        return ''
      },
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('fileBuilding')}
            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      enableSorting: true,
      meta: { columnClasses: '!hidden sm:!table-cell' } as ColumnMeta,
    },
    {
      accessorKey: 'dateUploaded',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('fileDate')}
            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      cell: ({ row }) => {
        const original = row.original as DbFile
        const iso = 'dateUploaded' in original ? (original as any).dateUploaded : undefined
        if (!iso) return ''
        const date = new Date(iso)
        const dateStr = date.toLocaleDateString(locale, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
        const timeStr = date.toLocaleTimeString(locale, {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        return `${dateStr} ${t('dateAt')} ${timeStr}`
      },
      enableSorting: true,
      meta: { columnClasses: '!hidden sm:!table-cell' } as ColumnMeta,
    },
    {
      accessorKey: 'fileType',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('fileType')}
            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      enableSorting: true,
      meta: { columnClasses: '!hidden sm:!table-cell' } as ColumnMeta,
    },
  ]

  // Return the appropriate columns based on the current viewer
  switch (currentViewer) {
    case 'buildings':
      return buildingsColumns
    case 'sites':
      return sitesColumns
    case 'infrastructure':
      return infrastructureColumns
    case 'files':
      return filesColumns
    default:
      return buildingsColumns // Default to buildings if viewer type is unknown
  }
}

export function useUserColumns(): ColumnDef<User>[] {
  const t = useTranslations('DataMenuColumns')

  return [
    {
      id: 'avatar',
      header: () => null,
      cell: ({ row }) => {
        const user = row.original
        return (
          <Avatar className="h-8 w-8 bg-white rounded-full overflow-hidden">
            <UserAvatar imageFileId={user?.imageFileId} name={user?.name} />
          </Avatar>
        )
      },
      enableSorting: false,
      meta: { columnClasses: '!w-12 !pl-4 !pr-1 !py-0' } as ColumnMeta,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('userName')}
            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      enableSorting: true,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('userEmail')}
            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      enableSorting: true,
    },
    {
      accessorKey: 'userRole',
      header: t('userRole'),
      cell: ({ row }) => <UserRoleCell userId={row.original.id} />,
      enableSorting: false,
    },
  ]
}

const roleFallbackOptions = Object.values(RoleNames)

const normalizeRoleName = (role?: string) => (role || '').toLowerCase()

const getRoleLabel = (t: ReturnType<typeof useTranslations>, role: string) => {
  const normalizedRole = normalizeRoleName(role)
  if (normalizedRole === RoleNames.admin) return t('roles.admin')
  if (normalizedRole === RoleNames.user) return t('roles.user')
  if (normalizedRole === RoleNames.viewer) return t('roles.viewer')
  return role
}

const UserRoleCell = ({ userId }: { userId: number }) => {
  const t = useTranslations('DataMenuColumns')
  const { data: session } = useSession()
  const { userRole: currentUserRole } = useUserRole(session?.user?.id || '')
  const isAdmin = currentUserRole && normalizeRoleName(currentUserRole.name) === RoleNames.admin

  const { userRole } = useUserRole(String(userId))
  const roleName = userRole?.name || ''
  const normalizedRoleName = normalizeRoleName(roleName)
  const options = Array.from(new Set([...roleFallbackOptions, normalizedRoleName].filter(Boolean)))
  const [selectedRole, setSelectedRole] = React.useState(normalizedRoleName || options[0] || '')

  React.useEffect(() => {
    if (normalizedRoleName) {
      setSelectedRole(normalizedRoleName)
    }
  }, [normalizedRoleName])

  if (!isAdmin) {
    return (
      <div className="flex gap-2 flex-wrap">
        {roleName ? (
          <Badge variant="secondary" className="font-medium">
            {getRoleLabel(t, roleName)}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">{t('roleEmptyValue')}</span>
        )}
      </div>
    )
  }

  return (
    <Select value={selectedRole} onValueChange={setSelectedRole}>
      <SelectTrigger className="h-8">
        <SelectValue placeholder={t('roleSelectPlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        {options.map(role => (
          <SelectItem key={role} value={role}>
            {getRoleLabel(t, role)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function useAssociatedBuildingsColumns(): ColumnDef<Building>[] {
  // Translations
  const t = useTranslations('DataMenuColumns')

  return [
    {
      accessorKey: 'buildingName',
      accessorFn: (row) => {
        // If buildingName exists and is not empty, use it; otherwise, use address
        if (row.buildingName) {
          return row.buildingName
        }
        return ''
      },
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('associatedBuildingsName')}
            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      enableSorting: true,
      meta: { columnClasses: '' } as ColumnMeta,
    },
    {
      accessorKey: 'buildingAddress',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('associatedBuildingsAddress')}
            {isSorted === false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown />}
            {isSorted === 'asc' && <LR.ArrowUp />}
          </Button>
        )
      },
      enableSorting: true,
      meta: { columnClasses: '' } as ColumnMeta,
    },
    {
      accessorKey: 'buildingProjectType',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('associatedBuildingsProjectType')}
            {isSorted === false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown />}
            {isSorted === 'asc' && <LR.ArrowUp />}
          </Button>
        )
      },
      enableSorting: true,
      meta: { columnClasses: '!hidden sm:!table-cell' } as ColumnMeta,
    },
  ]
}

export type PropertyFile = {
  name: string
  type: string
  createdAt: string
}

export function usePropertyFilesColumns(): ColumnDef<DbFile>[] {
  // Translations
  const t = useTranslations('DataMenuColumns')

  return [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('propertyFileName')}
            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      enableSorting: true,
      meta: { columnClasses: '' } as ColumnMeta,
    },
    {
      accessorKey: 'extension',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('propertyFileType')}
            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      enableSorting: true,
      meta: { columnClasses: '!hidden sm:!table-cell' } as ColumnMeta,
    },
    {
      accessorKey: 'dateUploaded',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={column.getToggleSortingHandler()}
            className="hover:bg-transparent p-0"
          >
            {t('propertyFilesDateUp')}
            {isSorted == false && <LR.ArrowUpDown />}
            {isSorted === 'desc' && <LR.ArrowDown className="text-black" />}
            {isSorted === 'asc' && <LR.ArrowUp className="text-black" />}
          </Button>
        )
      },
      enableSorting: true,
      meta: { columnClasses: 'invisible absolute sm:visible sm:static sm:table-cell' } as ColumnMeta,
    },
  ]
}

export type filterFieldOptions = {
  id: string
  label: string
  type: 'boolean' | 'string' | 'number' | 'date'
  valueOptions?: string[]
}

// Requirement for using the filter:
export function useBuildingDataFilterFields(): filterFieldOptions[] {
  const t = useTranslations('DataMenuColumns')

  return [
    { id: 'buildingName', label: t('filterFields.buildingName'), type: 'string' },
    { id: 'buildingCountrySubdivision', label: t('filterFields.buildingCountrySubdivision'), type: 'string' },
    { id: 'buildingMunicipality', label: t('filterFields.buildingMunicipality'), type: 'string' },
    { id: 'buildingType', label: t('filterFields.buildingType'), type: 'string' },
    { id: 'buildingAddress', label: t('filterFields.buildingAddress'), type: 'string' },
  ]
}

export function useSiteDataFilterFields(): filterFieldOptions[] {
  const t = useTranslations('DataMenuColumns')

  return [
    { id: 'siteName', label: t('filterFields.siteName'), type: 'string' },
    { id: 'siteCountrySubdivision', label: t('filterFields.siteCountrySubdivision'), type: 'string' },
    { id: 'siteMunicipality', label: t('filterFields.siteMunicipality'), type: 'string' },
    { id: 'siteAddress', label: t('filterFields.siteAddress'), type: 'string' },
  ]
}

export function useInfrastructureDataFilterFields(): filterFieldOptions[] {
  const t = useTranslations('DataMenuColumns')

  return [
    { id: 'infrastructureName', label: t('filterFields.infrastructureName'), type: 'string' },
    { id: 'infrastructureCountrySubdivision', label: t('filterFields.infrastructureCountrySubdivision'), type: 'string' },
    { id: 'infrastructureMunicipality', label: t('filterFields.infrastructureMunicipality'), type: 'string' },
    { id: 'infrastructureType', label: t('filterFields.infrastructureType'), type: 'string' },
    { id: 'infrastructureAddress', label: t('filterFields.infrastructureAddress'), type: 'string' },
  ]
}