'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Button } from '@collabdt/core/plugins-sdk/components'
import { usePluginTranslations } from '@collabdt/core/plugins-sdk/messages'

import { useMarkers } from '../markers'

interface Props {
  close: () => void
  /** Supplied by whichever surface opened this — the sidebar tab, or a row on the page. */
  markerKey?: string
}

/** One marker in full. Core owns the overlay and Escape; this outlives whatever opened it. */
export function MarkerDialog({ close, markerKey }: Props) {
  const t = usePluginTranslations()
  const { markers, selected } = useMarkers()

  const marker = markerKey
    ? markers.find(candidate => candidate.key === markerKey) ?? null
    : selected

  if (!marker) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {t('gone', 'That marker no longer exists.')}
        </p>
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
          style={{ backgroundColor: marker.colour }}
        />
        <p className="font-medium">{marker.name}</p>
      </div>

      <dl className="text-sm">
        <Row label={t('columnLatitude', 'Latitude')} value={marker.latitude.toFixed(5)} />
        <Row label={t('columnLongitude', 'Longitude')} value={marker.longitude.toFixed(5)} />
        <Row label={t('zoom', 'Zoom')} value={marker.zoom.toFixed(2)} />
        <Row label={t('colour', 'Colour')} value={marker.colour} />
      </dl>

      <Button className="self-end" onClick={close}>{t('close', 'Close')}</Button>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
