// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { usePluginState } from '../../sdk/state'
import { usePluginTranslations } from '../../sdk/messages'

// The host renders this inside the viewer sidebar's panel, so it gets the panel's width and
// nothing else to worry about. Fill the height and let the panel scroll.
//
// `usePluginState` is per-plugin and in memory, so a tool this plugin puts on the map can set
// `selected` and this tab re-renders with it — without a round trip or a shared parent.
export function {{COMPONENT}}() {
  const t = usePluginTranslations()
  const [selected, setSelected] = usePluginState<string | null>('selected', null)

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm text-muted-foreground">
        {selected ? t('selected', 'Selected: ') + selected : t('empty', 'Nothing selected yet.')}
      </p>

      <button
        type="button"
        className="self-start rounded-md border px-3 py-1.5 text-sm"
        onClick={() => setSelected(`item-${Math.floor(Math.random() * 100)}`)}
      >
        {t('pick', 'Pick something')}
      </button>
    </div>
  )
}
