// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Skeleton } from '../../../ui/'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../ui/Table'

export default function DatasetSkeleton() {
  const t = useTranslations('Datasets')

  return (
    <div className="flex flex-col h-full px-6">
      <div className="flex justify-center items-center py-4">
        <LR.Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">{t('fetchingDatasets')}</span>
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Leading cell - actions column header */}
              <TableHead className="w-10 p-2">
              </TableHead>
              {/* Name column */}
              <TableHead className="max-w-md">
                <Skeleton className="h-4 w-16" />
              </TableHead>
              {/* Subdivision column */}
              <TableHead className="!hidden md:!table-cell whitespace-nowrap">
                <Skeleton className="h-4 w-20" />
              </TableHead>
              {/* Municipality column */}
              <TableHead className="!hidden md:!table-cell whitespace-nowrap">
                <Skeleton className="h-4 w-24" />
              </TableHead>
              {/* Type column */}
              <TableHead className="whitespace-nowrap">
                <Skeleton className="h-4 w-12" />
              </TableHead>
              {/* Trailing cell - actions */}
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 9 }).map((_, index) => (
              <TableRow key={index}>
                {/* Leading cell - checkbox and star */}
                <TableCell className="w-10 p-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" /> {/* Checkbox */}
                    <Skeleton className="h-4 w-4" /> {/* Star */}
                  </div>
                </TableCell>
                {/* Name column */}
                <TableCell className="max-w-md">
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                {/* Province column */}
                <TableCell className="!hidden md:!table-cell whitespace-nowrap">
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                {/* Municipality column */}
                <TableCell className="!hidden md:!table-cell whitespace-nowrap">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                {/* Type column */}
                <TableCell className="whitespace-nowrap">
                  <Skeleton className="h-4 w-14" />
                </TableCell>
                {/* Trailing cell - chevron */}
                <TableCell className="w-10 p-2">
                  <Skeleton className="h-4 w-4" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
