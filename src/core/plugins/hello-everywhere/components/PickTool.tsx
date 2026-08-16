'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { Button, Separator } from '../../sdk/components'
import { usePluginTranslations } from '../../sdk/messages'
import { usePicks } from '../picks'

import type { MapToolProps } from '../../sdk/mapViewer'
import type { ToolbarToolProps } from '../../sdk/types'

/**
 * The writer. Everything else in this plugin reads what this records, which is what makes
 * the other four surfaces more than four unrelated widgets.
 */
export function PickTool({ map }: ToolbarToolProps & MapToolProps) {
  const t = usePluginTranslations()
  const { picks, add, clear } = usePicks()

  if (!map) {
    return (
      <div className="w-64 p-1">
        <p className="px-2 py-1 text-sm text-muted-foreground">
          {t('waiting', 'Waiting for the map…')}
        </p>
      </div>
    )
  }

  const pick = () => {
    const centre = map.getCenter()

    add({
      key: `${centre.lat.toFixed(5)},${centre.lng.toFixed(5)}`,
      name: `${t('legendRow', 'Picked')} ${picks.length + 1}`,
      latitude: centre.lat,
      longitude: centre.lng,
    })
  }

  return (
    <div className="w-64 p-1">
      <p className="px-2 py-1 text-sm font-medium">{t('toolTitle', 'Pick a point')}</p>
      <Separator className="my-1" />

      <Button size="sm" variant="ghost" className="w-full justify-start font-normal" onClick={pick}>
        {t('pick', 'Pick the map centre')}
      </Button>

      {picks.length > 0 && (
        <Button
          size="sm"
          variant="ghost"
          className="w-full justify-start font-normal"
          onClick={clear}
        >
          {t('clear', 'Clear')}
        </Button>
      )}
    </div>
  )
}
