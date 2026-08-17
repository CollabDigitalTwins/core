// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePluginStore } from '@collabdt/core/plugins-sdk/store'

import type { DataPageColumn } from '{{SURFACE_ENTRY}}'

export interface Row extends Record<string, unknown> {
  key: string
  name: string
  floor: string
}

// A hook, so rows can come from `usePluginStore` or any other hook.
export function useRows(): { rows: Row[]; isLoading?: boolean } {
  const store = usePluginStore<Omit<Row, 'key'>>('{{SLUG}}')

  return {
    rows: store.items.map(item => ({ key: item.key, ...item.data })),
    isLoading: store.isLoading,
  }
}

// `labelKey` falls back to the literal, so this reads before any translation exists.
export const columns: DataPageColumn<Row>[] = [
  { key: 'name', labelKey: 'Name' },
  { key: 'floor', labelKey: 'Floor' },
]
