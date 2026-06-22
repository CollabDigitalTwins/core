// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import React from 'react'
import { Skeleton } from '../components/ui/Skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/Table'

interface DataTableSkeletonProps {
  columns?: number
  rows?: number
  showLeadingCell?: boolean
  showTrailingCell?: boolean
  className?: string
  showPagination?: boolean
}

export function DataTableSkeleton({
  columns = 5,
  rows = 10,
  showLeadingCell = false,
  showTrailingCell = true,
  className = '',
  showPagination = true,
}: DataTableSkeletonProps) {
  return (
    <div className="flex flex-col h-full">
      <div className={`${className} rounded-md border overflow-hidden flex-1 flex flex-col`}>
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                {/* Leading cell skeleton */}
                {showLeadingCell && (
                  <TableHead className="w-10">
                    <Skeleton className="h-4 w-4" />
                  </TableHead>
                )}

                {/* Column header skeletons */}
                {Array.from({ length: columns }).map((_, index) => (
                  <TableHead key={index}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}

                {showTrailingCell && (
                  <TableHead className="w-10">
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {/* Leading cell skeleton */}
                  {showLeadingCell && (
                    <TableCell className="w-10 p-2">
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}

                  {/* Data cell skeletons */}
                  {Array.from({ length: columns }).map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      <Skeleton
                        className={`h-4 ${
                          colIndex === 0
                            ? 'w-32'
                            : colIndex === 1
                              ? 'w-24'
                              : colIndex === 2
                                ? 'w-16'
                                : 'w-20'
                        }`}
                      />
                    </TableCell>
                  ))}

                  {/* Trailing cell skeleton */}
                  {showTrailingCell && (
                    <TableCell className="w-10 p-2">
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination skeleton */}
      {showPagination && (
        <div className="flex items-center flex-wrap justify-center sm:justify-end gap-8 px-1 py-4">
          <div className="flex flex-row gap-2 items-center justify-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-16" />
          </div>

          <div>
            <Skeleton className="h-4 w-24" />
          </div>

          <div className="flex flex-row gap-2 items-center justify-center">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      )}
    </div>
  )
}
