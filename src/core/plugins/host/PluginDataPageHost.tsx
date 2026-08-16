'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '../../components/ui/Breadcrumb'
import { Input } from '../../components/ui/Input'
import { usePluginMessageLookup } from '../sdk/messages'

import { parsePluginViewerKey } from './pluginViewerKey'
import { usePluginConfigs, usePluginContributions } from './provider'
import { PluginScopeProvider } from './scope'
import { resolvePluginIcon } from './usePluginToolbarTools'

import type { ViewerKey } from '../../types/dbTypes'
import type { DataPageRegistration } from '../sdk/types'

type Row = Record<string, unknown>
type Registration = DataPageRegistration & { pluginId: string }

/**
 * Renders the `data.pages` contribution the current viewer key names.
 *
 * The frame mirrors `PluginsManager`, which mirrors `DataMenu` — a plugin page should be
 * indistinguishable from a built-in one, since it sits beside them in the same nav group.
 * The plugin supplies rows and columns and core supplies everything around them.
 */
export function PluginDataPageHost({ viewer }: { viewer: ViewerKey }) {
  const registrations = usePluginContributions('data.pages')
  const target = parsePluginViewerKey(viewer)

  const registration = target
    ? registrations.find(
      candidate => candidate.pluginId === target.pluginId && candidate.id === target.pageId,
    )
    : undefined

  // A key can name a page whose plugin was just disabled, or one that never existed — the
  // value comes from the URL. Rendering nothing lets `Viewer` fall back rather than crash.
  if (!registration) return null

  return <PluginDataPage key={viewer} registration={registration} />
}

function PluginDataPage({ registration }: { registration: Registration }) {
  const tData = useTranslations('DataMenu')
  const message = usePluginMessageLookup()
  const configs = usePluginConfigs()
  const [searchTerm, setSearchTerm] = React.useState('')

  const title = message(registration.pluginId, registration.titleKey, registration.titleKey)
  const Icon = resolvePluginIcon(registration.icon)

  return (
    <div className="sm:p-2 overflow-hidden bg-[#fafafa] h-full">
      <div className="bg-background rounded-xl shadow h-full min-h-0">
        <div className="flex flex-col h-full min-h-0">

          <div className="flex flex-row gap-2 justify-start items-center px-3 py-4 relative">
            <Breadcrumb className="px-3">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex flex-row justify-between items-center px-6 py-6">
            <div className="flex items-center gap-2">
              <Icon className="h-8 w-8" />
              <h1 className="text-2xl text-foreground">{title}</h1>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center px-3 sm:px-6 py-4 gap-3 sm:gap-4">
            <div className="w-full sm:w-96">
              <Input
                placeholder={`${tData('searchPlaceholder')} ${title}...`}
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                aria-label={`${tData('searchPlaceholder')} ${title}`}
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 pb-8">
            {/* The rows hook and the cell renderers are the plugin's, so they run inside its
                scope and can reach usePluginStore, usePluginState and the rest. */}
            <PluginScopeProvider
              pluginId={registration.pluginId}
              config={configs[registration.pluginId]}
            >
              <PluginDataTable
                key={`${registration.pluginId}:${registration.id}`}
                registration={registration}
                searchTerm={searchTerm}
              />
            </PluginScopeProvider>
          </div>

        </div>
      </div>
    </div>
  )
}

interface TableProps {
  registration: Registration
  searchTerm: string
}

function PluginDataTable({ registration, searchTerm }: TableProps) {
  const t = useTranslations('PluginDataPage')
  const message = usePluginMessageLookup()
  const { rows, isLoading, onRowClick } = registration.useRows()

  const filtered = React.useMemo(
    () => filterRows(rows, registration.searchKeys, searchTerm),
    [rows, registration.searchKeys, searchTerm],
  )

  if (isLoading && rows.length === 0) return <Empty text={t('loading')} />

  if (filtered.length === 0) {
    if (searchTerm.trim()) return <Empty text={t('noResults', { query: searchTerm.trim() })} />

    const empty = registration.emptyKey
      ? message(registration.pluginId, registration.emptyKey, registration.emptyKey)
      : t('empty')

    return <Empty text={empty} />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            {registration.columns.map(column => (
              <th key={column.key} scope="col" className="px-3 py-2 font-medium">
                {message(registration.pluginId, column.labelKey, column.labelKey)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              className={onRowClick ? 'border-b hover:bg-accent/50 cursor-pointer' : 'border-b'}
              // A row is only interactive when the plugin gave it something to do, so a
              // read-only page does not announce itself as a button to a screen reader.
              {...(onRowClick
                ? {
                  role: 'button' as const,
                  tabIndex: 0,
                  onClick: () => onRowClick(row),
                  onKeyDown: (event: React.KeyboardEvent) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    onRowClick(row)
                  },
                }
                : {})}
            >
              {registration.columns.map(column => (
                <td key={column.key} className="px-3 py-2">
                  {column.render ? column.render(row) : formatCell(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A plugin's own `key` when it supplied one, so a re-render does not remount every row. */
function rowKey(row: Row, index: number): string {
  return typeof row.key === 'string' ? row.key : String(index)
}

// Anything not a string or number renders empty rather than "[object Object]". A plugin that
// wants more supplies a `render` for the column.
function formatCell(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function filterRows(rows: Row[], searchKeys: string[] | undefined, searchTerm: string): Row[] {
  const query = searchTerm.trim().toLowerCase()
  if (!query) return rows

  return rows.filter((row) => {
    const keys = searchKeys ?? Object.keys(row)
    return keys.some(key => formatCell(row[key]).toLowerCase().includes(query))
  })
}

function Empty({ text }: { text: string }) {
  return <p className="py-12 text-center text-sm text-muted-foreground">{text}</p>
}
