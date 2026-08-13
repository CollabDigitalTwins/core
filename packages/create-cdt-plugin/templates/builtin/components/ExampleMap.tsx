'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { Separator } from '../../sdk/components'
import { usePluginConfig } from '../../sdk/config'
import { usePluginTranslations } from '../../sdk/messages'

import { ReadoutRow } from './ReadoutRow'

import type { MapToolProps } from '{{CORE_ENTRY}}'
import type { ToolbarToolProps } from '../../sdk/types'

interface Config extends Record<string, unknown> {
  decimals?: number
}

// Five things worth copying from this:
//
// 1. Render panel content, not chrome. Core supplies the button and dropdown around it.
// 2. `map` is nullable: the component can render before MapLibre has initialised.
// 3. Every listener is removed on cleanup, or it keeps firing after a viewer switch.
// 4. Strings come from the manifest's `messages` with an inline English fallback.
// 5. A plugin is as many components as it needs. This one is two files.
export function {{COMPONENT}}({ map }: ToolbarToolProps & MapToolProps) {
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
      <p className="px-2 py-1 text-sm font-medium">{t('title', '{{NAME}}')}</p>
      <Separator className="my-1" />

      {view ? (
        <dl className="px-2 py-1 text-sm">
          <ReadoutRow label={t('latitude', 'Latitude')} value={view.lat.toFixed(decimals)} />
          <ReadoutRow label={t('longitude', 'Longitude')} value={view.lng.toFixed(decimals)} />
          <ReadoutRow label={t('zoom', 'Zoom')} value={view.zoom.toFixed(2)} />
        </dl>
      ) : (
        <p className="px-2 py-1 text-sm text-muted-foreground">
          {t('waiting', 'Waiting for the map…')}
        </p>
      )}
    </div>
  )
}
