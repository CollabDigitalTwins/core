// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Dataset } from '../../../../../types/datasetTypes'
import * as React from "react";


const globalCache = new Map<string, {
  data: any
  timestamp: number
  promise?: Promise<any>
}>()

const CACHE_TTL = 5 * 60 * 1000

const featuresPrefetchQueue = new Set<string>()

export function useFastDatasetCache() {
  const prefetchQueue = React.useRef(new Set<string>())

  const getCacheKey = (dataset: Dataset) => {
    return `${dataset.id || dataset.name}_features`
  }

  const isExpired = (timestamp: number) => {
    return Date.now() - timestamp > CACHE_TTL
  }

  const prefetch = React.useCallback((dataset: Dataset) => {
    if (!dataset || typeof dataset.getFeaturesData !== 'function') return

    const key = getCacheKey(dataset)

    const cached = globalCache.get(key)
    if (cached && !isExpired(cached.timestamp)) return
    if (prefetchQueue.current.has(key)) return

    prefetchQueue.current.add(key)

    const promise = dataset.getFeaturesData().then(data => {
      globalCache.set(key, {
        data,
        timestamp: Date.now(),
      })
      prefetchQueue.current.delete(key)
      return data
    }).catch(err => {
      console.error('Prefetch failed:', err)
      prefetchQueue.current.delete(key)
      return null
    })

    // Store promise to deduplicate requests
    globalCache.set(key, {
      data: null,
      timestamp: Date.now(),
      promise,
    })

    if (typeof dataset.getFeatures === 'function') {
      const featuresKey = `${dataset.id || dataset.name}_geojson`
      if (!featuresPrefetchQueue.has(featuresKey)) {
        featuresPrefetchQueue.add(featuresKey)
        dataset.getFeatures().then(() => {
          featuresPrefetchQueue.delete(featuresKey)
        }).catch(() => {
          featuresPrefetchQueue.delete(featuresKey)
        })
      }
    }
  }, [])

  const getFromCache = React.useCallback(async (dataset: Dataset): Promise<any> => {
    if (!dataset || typeof dataset.getFeaturesData !== 'function') {
      return null
    }

    const key = getCacheKey(dataset)
    const cached = globalCache.get(key)

    if (cached && !isExpired(cached.timestamp)) {
      if (cached.promise) {
        return cached.promise
      }
      if (cached.data !== null) {
        return cached.data
      }
    }

    const promise = dataset.getFeaturesData().then(data => {
      globalCache.set(key, {
        data,
        timestamp: Date.now(),
      })
      return data
    })

    globalCache.set(key, {
      data: null,
      timestamp: Date.now(),
      promise,
    })

    return promise
  }, [])

  const clearCache = React.useCallback((dataset?: Dataset) => {
    if (dataset) {
      const key = getCacheKey(dataset)
      globalCache.delete(key)
    } else {
      globalCache.clear()
    }
  }, [])

  return { prefetch, getFromCache, clearCache }
}