// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** The id a plugin dataset carries in the Datasets store, namespaced so no two plugins collide. */
export function pluginDatasetId(pluginId: string, id: string): string {
  return `plugin:${pluginId}:${id}`
}
