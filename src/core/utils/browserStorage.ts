// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export const DATASET_CACHE_PREFIX = 'datasetCache:'
// Bump the version when the serialized tree shape changes; older versions count as retired.
export const SPATIAL_STRUCTURE_CACHE_PREFIX = 'bim:spatial-structure:v3:'

const SPATIAL_STRUCTURE_FAMILY = 'bim:spatial-structure:'
const RETIRED_FEATURE_TILE_PREFIX = 'features:'

const isRetiredKey = (key: string) =>
  key.startsWith(RETIRED_FEATURE_TILE_PREFIX)
  || (key.startsWith(SPATIAL_STRUCTURE_FAMILY) && !key.startsWith(SPATIAL_STRUCTURE_CACHE_PREFIX))

const isRebuildableKey = (key: string) =>
  isRetiredKey(key) || key.startsWith(DATASET_CACHE_PREFIX) || key.startsWith(SPATIAL_STRUCTURE_FAMILY)

function removeKeysWhere(matches: (key: string) => boolean): void {
  const storage = window.localStorage
  const doomed = Array.from({ length: storage.length }, (_, i) => storage.key(i))
    .filter((key): key is string => key !== null && matches(key))
  doomed.forEach(key => storage.removeItem(key))
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException
    && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
}

/** Drops keys no current code reads: the retired feature-tile cache and superseded spatial-structure versions. */
export function pruneRetiredStorage(): void {
  try {
    removeKeysWhere(isRetiredKey)
  }
  catch { /* storage unavailable */ }
}

/** Writes `value`, and on a full store first evicts every cache that can be refetched, then retries once. */
export function setItemMakingRoom(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  }
  catch (error) {
    if (!isQuotaError(error)) throw error
    removeKeysWhere(isRebuildableKey)
    window.localStorage.setItem(key, value)
  }
}
