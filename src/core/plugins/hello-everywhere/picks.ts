'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePluginState } from '../sdk/state'

export interface Pick extends Record<string, unknown> {
  key: string
  name: string
  latitude: number
  longitude: number
}

/**
 * The plugin's own state, shared by all five of its surfaces.
 *
 * This is the whole point of the example: the map tool writes here, and the sidebar tab, the
 * data page and the dialog read it — from unrelated React subtrees, with no shared parent
 * and no round trip. `usePluginStore` would persist it; nothing here needs to outlive the
 * tab, so it stays in memory.
 */
export function usePicks() {
  const [picks, setPicks] = usePluginState<Pick[]>('picks', [])
  const [selectedKey, setSelectedKey] = usePluginState<string | null>('selected', null)

  const add = (pick: Pick) => {
    setPicks(current => [...current, pick])
    setSelectedKey(pick.key)
  }

  const clear = () => {
    setPicks([])
    setSelectedKey(null)
  }

  return {
    picks,
    selected: picks.find(pick => pick.key === selectedKey) ?? null,
    add,
    clear,
    select: setSelectedKey,
  }
}
