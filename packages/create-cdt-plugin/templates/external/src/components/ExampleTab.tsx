// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePluginState } from '@collabdt/core/plugins-sdk/state'
import { usePluginTranslations } from '@collabdt/core/plugins-sdk/messages'

// Rendered in the sidebar panel. `usePluginState` is per-plugin, so a map tool can set it.
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
