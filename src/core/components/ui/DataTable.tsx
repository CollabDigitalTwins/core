'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'


// Shadcn components

// Icons
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { MapContext, MenusContext } from '../../store'
import { DataTableSkeleton } from '../DataTableSkeleton'

import { Button } from './Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './Select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './Table'

import type { ViewerNames } from '../../types/'
import type { ColumnMeta } from '../viewers/Data/utils/Columns'
import type {
  ColumnDef,
  SortingState} from '@tanstack/react-table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowClick?: (row: TData) => void
  onRowHover?: (row: TData) => void
  currentViewer?: string
  className?: string
  paginationClasses?: string
  leadingCell?: React.ComponentType<any>
  trailingCell?: React.ComponentType<any>
  showPagination?: boolean
  tab?: string
  isLoading?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  onRowHover,
  currentViewer,
  className,
  paginationClasses,
  trailingCell: TrailingCell,
  leadingCell: LeadingCell,
  showPagination = true,
  tab = '',
  isLoading = false,
}: DataTableProps<TData, TValue>) {
  // Translation
  const t = useTranslations('DataTable')

  const [pageIndex, setPageIndex] = React.useState(0)

  const [sorting, setSorting] = React.useState<SortingState>([])

  const { state: menusState, dispatch: menusDispatch } = React.useContext(MenusContext)

  const { rowsPerPage } = menusState.menus

  const { state: mapState } = React.useContext(MapContext)

  const { currentLocation, countrySubdivisionsData } = mapState.map
  const { countrySubdivision, municipality } = currentLocation || {}

  const [countrySubdivisionName, setCountrySubdivisionName] = React.useState<string>('')

  React.useEffect(() => {
    if (countrySubdivisionsData && countrySubdivision) {
      const sub = countrySubdivisionsData[countrySubdivision] as any
      setCountrySubdivisionName((sub?.name ?? sub) || '')
    }
  }, [countrySubdivisionsData, countrySubdivision])

  const capitalize = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1) : ''

  type DataTypes = 'applied' | 'favourites' | 'national' | 'countrySubdivision' | 'municipal' | ViewerNames | ''

  const dataType: DataTypes = React.useMemo(() => {
    return (tab || currentViewer || '') as DataTypes
  }, [currentViewer, tab])

  // Keep the user on their current page when the data array changes for benign
  // reasons (a row's publish state refreshing, a checkbox/favourite toggle, etc.).
  // TanStack's autoResetPageIndex defaults to true, which would snap back to page 1
  // on every data change. We clamp manually below instead (see effect).
  const table = useReactTable({
    data,
    columns,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      pagination: {
        pageSize: rowsPerPage,
        pageIndex: pageIndex,
      },
    },
    onPaginationChange: (updater) => {
      const newPagination
        = typeof updater === 'function'
          ? updater({ pageIndex, pageSize: rowsPerPage })
          : updater

      setPageIndex(newPagination.pageIndex)
      if (newPagination.pageSize !== rowsPerPage) {
        menusDispatch({ type: 'SET_PAGINATION_ROWS_PER_PAGE', payload: { rowsPerPage: newPagination.pageSize } })
      }
    },
  })

  // If the data shrinks (filter/search/un-publish) so the current page no longer
  // exists, clamp to the last valid page rather than showing an empty table.
  React.useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(data.length / rowsPerPage))
    if (pageIndex > pageCount - 1) {
      setPageIndex(pageCount - 1)
    }
  }, [data.length, rowsPerPage, pageIndex])

  // Show skeleton when loading
  if (isLoading) {
    return (
      <DataTableSkeleton
        columns={columns.length}
        rows={rowsPerPage}
        showLeadingCell={!!LeadingCell}
        showTrailingCell={!!TrailingCell}
        className={className}
        showPagination={showPagination}
      />
    )
  }
  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">{t('no')} {currentViewer} {t('availableAtTheMoment')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className={`${className} rounded-md border overflow-hidden flex-1 flex flex-col`}>
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {/* Empty header cell for LeadingCell if it exists */}
                  {LeadingCell && <TableHead></TableHead>}
                  {headerGroup.headers.map((header) => {
                    // Get the column classes from meta
                    const meta = header.column.columnDef.meta as ColumnMeta | undefined
                    const columnClasses = meta?.columnClasses || ''

                    return (
                      <TableHead key={header.id} className={`${columnClasses}`}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    )
                  })}
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map(row => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={(e) => {
                      // Only trigger row click if not clicking on the dropdown
                      if (
                        !(e.target as HTMLElement).closest('.dropdown-menu-trigger')
                        && !(e.target as HTMLElement).closest('Button')
                        && onRowClick) {
                        onRowClick(row.original as TData)
                      }
                    }}
                    onMouseEnter={() => {
                      if (onRowHover) {
                        onRowHover(row.original as TData)
                      }
                    }}
                  >
                    {/* leading cell(s) */}
                    {LeadingCell
                      && (
                        <TableCell className="w-px p-1 sm:p-2">
                          <LeadingCell dataset={row.original} />
                        </TableCell>
                      )}

                    {/* Table content */}
                    {row.getVisibleCells().map((cell) => {
                      // Get the column classes from meta for cells
                      const meta = cell.column.columnDef.meta as ColumnMeta | any
                      const columnClasses = meta?.columnClasses || ''

                      return (
                        <TableCell key={cell.id} className={columnClasses}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      )
                    })}

                    {/* trailing cell(s) */}
                    {TrailingCell
                      && (
                        <TableCell className="w-px p-1 sm:p-2">
                          <TrailingCell row={row} />
                        </TableCell>
                      )}

                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                    {dataType === 'applied' && t('noApplied')}
                    {dataType === 'favourites' && t('noFavorite')}
                    {dataType === 'national' && `${t('noNational')}`}
                    {dataType === 'countrySubdivision' && `${t('noProvincial')} ${countrySubdivisionName}`}
                    {dataType === 'municipal' && `${t('noMunicipal')} ${municipality}`}
                    {dataType === 'buildings' && `${t('noBuildings')}`}
                    {dataType === 'sites' && `${t('noSites')} `}
                    {dataType === 'files' && `${t('noFiles')}`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {/* Pagination */}
      {showPagination && (
        <div className={`flex items-center flex-wrap justify-center sm:justify-end gap-3 sm:gap-8 px-1 py-4 ${paginationClasses}`}>
          <div className="flex flex-row gap-2 items-center justify-center">
            <span className="text-sm text-foreground text-nowrap">{t('paginationTitle')}</span>
            <Select
              value={rowsPerPage.toString()}
              onValueChange={(value) => {
                const rowsPerPage = Number.parseInt(value)
                menusDispatch({ type: 'SET_PAGINATION_ROWS_PER_PAGE', payload: { rowsPerPage } })
                table.setPageSize(rowsPerPage)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <span className="text-sm text-foreground">
              {t('page')}
              {' '}
              {table.getState().pagination.pageIndex + 1}
              {' '}
              {t('of')}
              {' '}
              {table.getPageCount()}
            </span>
          </div>

          <div className="flex flex-row gap-2 items-center justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.lastPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
