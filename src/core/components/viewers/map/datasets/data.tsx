// Dependencies
import * as React from 'react'
import type { Dataset } from '../../../../types/datasetTypes'
import { ColumnDef } from '@tanstack/react-table'
import { useTranslations } from 'next-intl'

// Shadcn Components
import { Button } from '../../../../components/ui/Button'

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { MapContext } from '../../../../store/Map/context'

export interface ColumnMeta {
  columnClasses: string
}

export function useColumns<TData = Dataset>(): ColumnDef<TData>[] {
  // Translation
  const t = useTranslations('DataColumns')

  const { state: mapState } = React.useContext(MapContext)
  const countrySubdivisionsData = mapState.map.countrySubdivisionsData

  const getSubdivisionName = (code: string | undefined | null): string => {
    if (!code) return ''
    if (!countrySubdivisionsData) return code
    const exact = countrySubdivisionsData[code] as any
    if (exact) return (exact?.name ?? exact) || code
    const entry = Object.entries(countrySubdivisionsData).find(([k]) => k.endsWith(`-${code}`))
    if (entry) return ((entry[1] as any)?.name ?? entry[1]) || code
    return code
  }

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
            {t('name')}
            {isSorted == false && <ArrowUpDown />}
            {isSorted === 'desc' && <ArrowDown className="text-black" />}
            {isSorted === 'asc' && <ArrowUp className="text-black" />}
          </Button>
        )
      },
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue() as string
        return (
          <div className="max-w-md truncate" title={value}>
            {value}
          </div>
        )
      },
      meta: { columnClasses: 'max-w-md' } as ColumnMeta,
    },
    {
      accessorKey: 'countrySubdivision',
      header: t('countrySubdivision'),
      cell: ({ getValue }) => {
        const code = getValue() as string
        const name = getSubdivisionName(code)
        return (
          <div className="whitespace-nowrap" title={code}>
            {name}
          </div>
        )
      },
      meta: { columnClasses: '!hidden md:!table-cell whitespace-nowrap' } as ColumnMeta,
    },
    {
      accessorKey: 'municipality',
      header: t('municipality'),
      cell: ({ getValue }) => {
        const value = getValue() as string
        return (
          <div className="whitespace-nowrap" title={value}>
            {value}
          </div>
        )
      },
      meta: { columnClasses: '!hidden md:!table-cell whitespace-nowrap' } as ColumnMeta,
    },
    {
      accessorKey: 'type',
      header: t('type'),
      cell: ({ getValue }) => {
        const value = getValue() as string
        return (
          <div className="whitespace-nowrap" title={value}>
            {value}
          </div>
        )
      },
      meta: { columnClasses: 'whitespace-nowrap' } as ColumnMeta,
    },
  ]
}
