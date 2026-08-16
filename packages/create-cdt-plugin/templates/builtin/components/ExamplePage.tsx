// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePluginStore } from '../../sdk/store'

import type { DataPageColumn } from '{{CORE_ENTRY}}'

export interface Row extends Record<string, unknown> {
  key: string
  name: string
  floor: string
}

// A hook, not a value: the host calls it while rendering the page, so rows can come from
// `usePluginStore`, from the SDK's data hooks, or from anywhere else a hook can read.
export function useRows(): { rows: Row[]; isLoading?: boolean } {
  const store = usePluginStore<Omit<Row, 'key'>>('{{SLUG}}')

  return {
    rows: store.items.map(item => ({ key: item.key, ...item.data })),
    isLoading: store.isLoading,
  }
}

// `labelKey` is looked up in this plugin's own message namespace and falls back to the
// literal, so this reads sensibly before any translation exists.
export const columns: DataPageColumn<Row>[] = [
  { key: 'name', labelKey: 'Name' },
  { key: 'floor', labelKey: 'Floor' },
]
