// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";

import type { Dataset } from '../../../../../types/datasetTypes'

const globalCache = new Map<string, { timestamp: number, promise: Promise<unknown> }>()

const CACHE_TTL = 5 * 60 * 1000

const cacheKey = (dataset: Dataset) => `${dataset.id || dataset.name}_features`

/** A dataset's `getFeaturesData` result, shared across callers and kept for five minutes. */
export function useFastDatasetCache() {
  const getFromCache = React.useCallback((dataset: Dataset): Promise<unknown> => {
    if (typeof dataset?.getFeaturesData !== 'function') return Promise.resolve(null)

    const key = cacheKey(dataset)
    const cached = globalCache.get(key)
    if (cached && Date.now() - cached.timestamp <= CACHE_TTL) return cached.promise

    const promise = dataset.getFeaturesData()
    globalCache.set(key, { timestamp: Date.now(), promise })
    void promise.then(data => { if (data == null) globalCache.delete(key) }, () => undefined)
    return promise
  }, [])

  return { getFromCache }
}
