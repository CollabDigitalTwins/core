'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { TableHead } from '../ui/Table'

import type { ReactNode } from 'react'

export interface SortState<Key extends string> {
  key: Key
  descending: boolean
}

interface SortHeaderProps<Key extends string> {
  column: Key
  sort: SortState<Key>
  onSort: (key: Key) => void
  children: ReactNode
  numeric?: boolean
}

export function SortHeader<Key extends string>({ column, sort, onSort, children, numeric }: SortHeaderProps<Key>) {
  const Icon = sort.key !== column ? ArrowUpDown : sort.descending ? ArrowDown : ArrowUp
  return (
    <TableHead className={numeric ? 'text-right' : undefined} aria-sort={sort.key === column ? (sort.descending ? 'descending' : 'ascending') : 'none'}>
      <button type="button" className={`inline-flex items-center gap-1 hover:text-foreground ${numeric ? 'flex-row-reverse' : ''}`} onClick={() => onSort(column)}>
        {children}
        <Icon aria-hidden className="h-3.5 w-3.5" />
      </button>
    </TableHead>
  )
}

/** Clicking the active column flips it; a new column starts descending unless it is a text column. */
export function nextSort<Key extends string>(current: SortState<Key>, key: Key, textColumns: readonly Key[]): SortState<Key> {
  return { key, descending: current.key === key ? !current.descending : !textColumns.includes(key) }
}

export function compareValues(left: string | number, right: string | number): number {
  return typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right))
}
