'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Button } from '../../sdk/components'
import { usePluginTranslations } from '../../sdk/messages'
import { usePluginDialogs } from '../../sdk/ui'
import { usePicks } from '../picks'

/**
 * The viewer sidebar tab. Registered for the map and the BIM viewer, so a point picked on
 * the map is already listed here after switching to BIM — nothing was passed between them.
 */
export function PicksTab() {
  const t = usePluginTranslations()
  const { picks, selected, select } = usePicks()
  const { open } = usePluginDialogs()

  if (picks.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        {t('nothingSelected', 'Nothing picked yet. Use the Pick a point tool on the map.')}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <p className="text-xs text-muted-foreground">
        {t('crossSurface', 'Picked on the map, shown here — the same plugin state reaches every surface.')}
      </p>

      <ul className="flex flex-col gap-1">
        {picks.map(pick => (
          <li key={pick.key}>
            <button
              type="button"
              onClick={() => select(pick.key)}
              className={`w-full rounded-md px-2 py-1 text-left text-sm ${
                selected?.key === pick.key ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
            >
              {pick.name}
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <Button size="sm" variant="outline" onClick={() => open('detail', { pickKey: selected.key })}>
          {t('openDetail', 'Open')}
        </Button>
      )}
    </div>
  )
}
