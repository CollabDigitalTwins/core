'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { Button, Separator } from '../../sdk/components'
import { usePluginConfig } from '../../sdk/config'
import { usePluginTranslations } from '../../sdk/messages'

import type { MapToolProps } from '../../sdk/mapViewer'
import type { ToolbarToolProps } from '../../sdk/types'

interface Config extends Record<string, unknown> {
  decimals?: number
}

/**
 * Reads the map's centre and zoom, and keeps them current as the user pans.
 *
 * Four things a plugin author should copy from this:
 *
 * 1. **Render panel content, not chrome.** Core wraps every toolbar contribution
 *    in the standard button-and-dropdown, built from the `label` and `icon` in
 *    the registration. A plugin that renders its own floating card would end up
 *    inside the toolbar strip.
 * 2. **`map` is nullable.** The component can render before MapLibre has
 *    finished initialising. Guard it rather than asserting.
 * 3. **Every listener is removed on cleanup.** A plugin that leaks a `move`
 *    handler keeps firing after the user has switched viewers.
 * 4. **Strings come from the manifest's `messages`**, with an inline English
 *    fallback, so the plugin still reads correctly in a locale it has not
 *    translated — and works at all if it ships no translations.
 */
export function HelloMapTool({ map }: ToolbarToolProps & MapToolProps) {
  const t = usePluginTranslations()
  const { decimals = 5 } = usePluginConfig<Config>()

  const [view, setView] = React.useState<{ lng: number; lat: number; zoom: number } | null>(null)

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

  return (
    <div className="w-60 p-1">
      <p className="px-2 py-1 text-sm font-medium">{t('title', 'Hello Map')}</p>
      <Separator className="my-1" />

      {view ? (
        <>
          <dl className="px-2 py-1 text-sm">
            <Row label={t('latitude', 'Latitude')} value={view.lat.toFixed(decimals)} />
            <Row label={t('longitude', 'Longitude')} value={view.lng.toFixed(decimals)} />
            <Row label={t('zoom', 'Zoom')} value={view.zoom.toFixed(2)} />
          </dl>

          <Button
            size="sm"
            variant="ghost"
            className="mt-1 w-full justify-start font-normal"
            onClick={() => {
              void navigator.clipboard?.writeText(
                `${view.lat.toFixed(decimals)}, ${view.lng.toFixed(decimals)}`,
              )
            }}
          >
            {t('copy', 'Copy coordinates')}
          </Button>
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
