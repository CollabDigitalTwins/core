'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { Button, Separator } from '../../sdk/components'
import { usePluginConfig } from '../../sdk/config'
import { usePluginTranslations } from '../../sdk/messages'
import { useMarkers } from '../markers'

import type { MapToolProps } from '../../sdk/mapViewer'
import type { ToolbarToolProps } from '../../sdk/types'

interface Config extends Record<string, unknown> {
  decimals?: number
}

/**
 * Where the map is, and a button to record it. The marker itself is drawn by `MarkersLayer`,
 * because this panel unmounts as soon as the dropdown closes.
 */
export function MapTool({ map }: ToolbarToolProps & MapToolProps) {
  const t = usePluginTranslations()
  const { decimals = 5 } = usePluginConfig<Config>()
  const { add, markers, lastError } = useMarkers()

  const [view, setView] = React.useState<{ lng: number; lat: number; zoom: number } | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!map) return

    const read = () => {
      const centre = map.getCenter()
      setView({ lng: centre.lng, lat: centre.lat, zoom: map.getZoom() })
    }

    read()
    map.on('move', read)
    return () => {
      map.off('move', read)
    }
  }, [map])

  const record = async () => {
    if (!view || saving) return

    setSaving(true)
    try {
      await add(view.lat, view.lng, view.zoom)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-64 p-1">
      <p className="px-2 py-1 text-sm font-medium">{t('title', 'Hello Map')}</p>
      <Separator className="my-1" />

      {view ? (
        <>
          <dl className="px-2 py-1 text-sm">
            <Row label={t('latitude', 'Latitude')} value={view.lat.toFixed(decimals)} />
            <Row label={t('longitude', 'Longitude')} value={view.lng.toFixed(decimals)} />
            <Row label={t('zoom', 'Zoom')} value={view.zoom.toFixed(2)} />
          </dl>

          <Separator className="my-1" />

          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-start font-normal"
            disabled={saving}
            onClick={() => { void record() }}
          >
            {saving ? t('recording', 'Recording…') : t('record', 'Record a marker here')}
          </Button>

          <p className="px-2 py-1 text-xs text-muted-foreground">
            {t('markerCount', 'Markers: ')}{markers.length}
          </p>

          {lastError && (
            <p className="px-2 py-1 text-xs text-destructive">
              {t('saveFailed', 'Could not save: ')}{lastError}
            </p>
          )}
        </>
      ) : (
        <p className="px-2 py-1 text-sm text-muted-foreground">
          {t('waiting', 'Waiting for the map…')}
        </p>
      )}
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
