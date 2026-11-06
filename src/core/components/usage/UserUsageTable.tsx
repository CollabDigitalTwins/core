'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useLocale, useTranslations } from 'next-intl'

import { useMemo, useState } from 'react'

import { gbFormatter, numberFormatter, relativeTime } from '../../utils/usageFormat'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../ui/Table'

import { compareValues, nextSort, SortHeader } from './SortHeader'


import type { SortState as GenericSortState } from './SortHeader'
import type { UserUsageRow } from '../../types/usage'
import type { ReactNode } from 'react'

type SortKey = 'name' | 'organization' | 'storedGB' | 'fileCount' | 'lastUploadAt'
type SortState = GenericSortState<SortKey>

const TEXT_COLUMNS: readonly SortKey[] = ['name', 'organization']

function sortValue(row: UserUsageRow, key: SortKey): string | number {
  if (key === 'name') return (row.name ?? '').toLowerCase()
  if (key === 'organization') return (row.organizationTitle ?? row.organizationName).toLowerCase()
  if (key === 'lastUploadAt') return row.lastUploadAt ?? ''
  return row[key]
}

export function sortUserRows(rows: readonly UserUsageRow[], sort: SortState): UserUsageRow[] {
  const direction = sort.descending ? -1 : 1
  return [...rows].sort((a, b) => direction * compareValues(sortValue(a, sort.key), sortValue(b, sort.key)))
}

interface UserUsageTableProps {
  rows: readonly UserUsageRow[]
  showOrganization: boolean
  actions?: ReactNode
}

export function UserUsageTable({ rows, showOrganization, actions }: UserUsageTableProps) {
  const t = useTranslations('UsageReport.table')
  const locale = useLocale()
  const gb = gbFormatter(locale)
  const count = numberFormatter(locale, 0)
  const [sort, setSort] = useState<SortState>({ key: 'storedGB', descending: true })
  const sorted = useMemo(() => sortUserRows(rows, sort), [rows, sort])
  const onSort = (key: SortKey) => setSort(current => nextSort(current, key, TEXT_COLUMNS))

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>{t('title')}</CardTitle>
        {actions}
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader column="name" sort={sort} onSort={onSort}>{t('user')}</SortHeader>
                {showOrganization && <SortHeader column="organization" sort={sort} onSort={onSort}>{t('organization')}</SortHeader>}
                <SortHeader column="storedGB" sort={sort} onSort={onSort} numeric>{t('stored')}</SortHeader>
                <SortHeader column="fileCount" sort={sort} onSort={onSort} numeric>{t('files')}</SortHeader>
                <SortHeader column="lastUploadAt" sort={sort} onSort={onSort} numeric>{t('lastUpload')}</SortHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(row => (
                <TableRow key={`${row.userId ?? 'none'}-${row.organizationName}`}>
                  <TableCell>
                    {row.userId === null ? (
                      <span className="italic text-muted-foreground">{t('unattributed')}</span>
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-medium">{row.name ?? t('deletedUser')}</span>
                        {row.email && <span className="text-xs text-muted-foreground">{row.email}</span>}
                      </div>
                    )}
                  </TableCell>
                  {showOrganization && <TableCell>{row.organizationTitle ?? row.organizationName}</TableCell>}
                  <TableCell className="text-right tabular-nums">{gb(row.storedGB)}</TableCell>
                  <TableCell className="text-right tabular-nums">{count(row.fileCount)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{relativeTime(locale, row.lastUploadAt) ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
