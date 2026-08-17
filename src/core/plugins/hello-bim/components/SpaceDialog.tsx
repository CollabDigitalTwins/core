'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useBimViewer } from '../../sdk/bimViewer'
import { Button } from '../../sdk/components'
import { usePluginTranslations } from '../../sdk/messages'
import { toModelIdMap, useSpaces } from '../spaces'

interface Props {
  close: () => void
  /** Supplied by whichever surface opened this — the sidebar tab, or the toolbar panel. */
  spaceKey?: string
}

/**
 * One space in full, including the IFC attributes the plugin does not store.
 *
 * Core owns the overlay, the title bar, the focus trap and Escape; this renders the body.
 * It outlives whatever opened it, so opening it from the toolbar panel and then clicking
 * away leaves it on screen.
 */
export function SpaceDialog({ close, spaceKey }: Props) {
  const t = usePluginTranslations()
  const { getProperties } = useBimViewer()
  const { spaces, selected } = useSpaces()

  const space = spaceKey
    ? spaces.find(candidate => candidate.key === spaceKey) ?? null
    : selected

  const [attributes, setAttributes] = React.useState<Record<string, unknown> | null>(null)

  React.useEffect(() => {
    if (!space) return
    let cancelled = false

    void getProperties(toModelIdMap([space]))
      .then((results) => {
        if (!cancelled) setAttributes(results[0] ?? {})
      })
      .catch(() => {
        if (!cancelled) setAttributes({})
      })

    return () => {
      cancelled = true
    }
  }, [space, getProperties])

  if (!space) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t('gone', 'That space is no longer loaded.')}</p>
        <Button className="self-end" onClick={close}>{t('close', 'Close')}</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 rounded-full border border-white"
          style={{ backgroundColor: space.colour }}
        />
        <p className="font-medium">{space.name}</p>
      </div>

      <dl className="text-sm">
        <Row label={t('ifcNameLabel', 'Name in the model')} value={space.ifcName} />
        <Row label={t('modelLabel', 'Model')} value={space.modelId} />
        <Row label={t('idLabel', 'Element id')} value={String(space.localId)} />
        <Row label={t('colour', 'Colour')} value={space.colour} />
      </dl>

      <div>
        <p className="mb-1 text-xs font-medium">{t('attributes', 'IFC attributes')}</p>
        {attributes === null ? (
          <p className="text-xs text-muted-foreground">{t('loading', 'Reading the model…')}</p>
        ) : (
          <dl className="max-h-48 overflow-y-auto text-xs">
            {Object.entries(attributes)
              .filter(([key]) => key !== 'modelId' && key !== 'localId')
              .map(([key, value]) => (
                <Row key={key} label={key} value={readable(value)} />
              ))}
          </dl>
        )}
      </div>

      <Button className="self-end" onClick={close}>{t('close', 'Close')}</Button>
    </div>
  )
}

/**
 * IFC attributes arrive either bare or wrapped in `{ value }`, depending on the model, and
 * some are nested objects with no useful text at all. Only primitives are rendered — the
 * rest show as blank rather than as `[object Object]`.
 */
function readable(value: unknown): string {
  const unwrapped = value && typeof value === 'object' && 'value' in value
    ? (value as { value: unknown }).value
    : value

  switch (typeof unwrapped) {
    case 'string': return unwrapped
    case 'number':
    case 'boolean': return String(unwrapped)
    default: return ''
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="truncate text-right">{value}</dd>
    </div>
  )
}
