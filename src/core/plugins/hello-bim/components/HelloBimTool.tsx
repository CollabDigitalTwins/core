'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { Badge, Button, Separator } from '../../sdk/components'
import { usePluginConfig } from '../../sdk/config'
import { usePluginTranslations } from '../../sdk/messages'

import type { BimToolProps, ModelIdMap } from '../../sdk/bimViewer'
import type { ToolbarToolProps } from '../../sdk/types'

interface Config extends Record<string, unknown> {
  category?: string
}

interface SpaceRow {
  modelId: string
  localId: number
  name: string
}

/**
 * Lists the spaces in the loaded model, and drives the viewer from that list.
 *
 * The whole point of this plugin is to prove the boundary: everything here comes
 * from `BimToolProps`, which arrives as props, and from `../sdk/*`. It never
 * imports `@thatopen`, never touches a core store, and never reaches into the
 * viewer's internals.
 *
 * Note the visibility step. `IFCSPACE` is hidden by default — spaces are
 * volumetric and would obscure everything inside them — so listing them is not
 * the same as showing them. A plugin author hits this immediately, which is
 * exactly why the example handles it.
 */
export function HelloBimTool({
  modelIds,
  selection,
  select,
  fitToSelection,
  setItemsVisible,
  getItemsOfCategory,
  getProperties,
}: ToolbarToolProps & BimToolProps) {
  const t = usePluginTranslations()
  const { category = 'IFCSPACE' } = usePluginConfig<Config>()

  const [rows, setRows] = React.useState<SpaceRow[] | null>(null)
  const [items, setItems] = React.useState<ModelIdMap>({})
  const [visible, setVisible] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const modelKey = modelIds.join(',')

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      if (modelIds.length === 0) {
        setRows([])
        return
      }

      setLoading(true)
      try {
        const found = await getItemsOfCategory(category)
        // 'Name' is the human label; 'LongName' is where most authoring tools put
        // the room name, so read both and prefer whichever is filled in.
        const properties = await getProperties(found, ['Name', 'LongName'])
        if (cancelled) return

        setItems(found)
        setRows(properties.map(property => ({
          modelId: String(property.modelId),
          localId: Number(property.localId),
          name: readName(property) ?? t('unnamed', 'Unnamed'),
        })))
      } catch (error) {
        if (!cancelled) {
          console.error('hello-bim: failed to read spaces', error)
          setRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
    // modelKey, not modelIds: the array identity changes on every store update.
  }, [modelKey, category, getItemsOfCategory, getProperties, t])

  const selectedIds = React.useMemo(() => {
    const ids = new Set<number>()
    for (const set of Object.values(selection)) {
      for (const id of set) ids.add(id)
    }
    return ids
  }, [selection])

  const toggleVisibility = async () => {
    const next = !visible
    setVisible(next)
    await setItemsVisible(items, next)
  }

  const focus = async (row: SpaceRow) => {
    await select({ [row.modelId]: new Set([row.localId]) })
    await fitToSelection()
  }

  return (
    <div className="w-72 p-1">
      <div className="flex items-center justify-between gap-2 px-2 py-1">
        <p className="text-sm font-medium">{t('title', 'Hello BIM')}</p>
        {rows !== null && (
          <Badge variant="outline" className="font-normal tabular-nums">{rows.length}</Badge>
        )}
      </div>
      <Separator className="my-1" />

      {modelIds.length === 0 ? (
        <p className="px-2 py-1 text-sm text-muted-foreground">
          {t('noModel', 'Load a BIM model to see its spaces.')}
        </p>
      ) : loading || rows === null ? (
        <p className="px-2 py-1 text-sm text-muted-foreground">{t('loading', 'Reading spaces…')}</p>
      ) : rows.length === 0 ? (
        <p className="px-2 py-1 text-sm text-muted-foreground">
          {t('noSpaces', 'This model has no spaces defined.')}
        </p>
      ) : (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-start font-normal"
            onClick={() => void toggleVisibility()}
          >
            {visible
              ? t('hideSpaces', 'Hide spaces in the model')
              : t('showSpaces', 'Show spaces in the model')}
          </Button>

          <Separator className="my-1" />

          <ul className="max-h-64 overflow-y-auto">
            {rows.map(row => (
              <li key={`${row.modelId}:${row.localId}`}>
                <button
                  type="button"
                  onClick={() => void focus(row)}
                  aria-current={selectedIds.has(row.localId) || undefined}
                  className="flex w-full items-baseline justify-between gap-2 rounded px-2 py-1 text-left text-sm hover:bg-muted aria-[current]:bg-muted aria-[current]:font-medium"
                >
                  <span className="truncate">{row.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {row.localId}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/** Prefers LongName, which is where most authoring tools put the room name. */
function readName(property: Record<string, unknown>): string | undefined {
  for (const key of ['LongName', 'Name']) {
    const raw = property[key]
    // Fragments returns attributes as either a bare string or { value }.
    const value = typeof raw === 'object' && raw !== null
      ? (raw as { value?: unknown }).value
      : raw
    if (typeof value === 'string' && value.trim().length > 0) return value
  }
  return undefined
}
