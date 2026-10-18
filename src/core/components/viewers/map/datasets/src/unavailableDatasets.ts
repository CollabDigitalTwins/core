// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { DAY_MS, getCache, HOUR_MS, liveKeysWithPrefix, makeKey, setCache } from './cache'

import type { Dataset } from '../../../../../types/datasetTypes'

type DatasetIdentity = Pick<Dataset, 'id' | 'name' | 'portal'>

const UNAVAILABLE_PREFIX = makeKey(['unavailable-dataset', ''])
const REMEMBER_MS = { empty: DAY_MS, denied: DAY_MS, failed: HOUR_MS } as const

export type UnavailableReason = keyof typeof REMEMBER_MS

const listeners = new Set<() => void>()
let marks = 0

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

const markCount = () => marks

function unavailableKey(dataset: DatasetIdentity): string {
  return makeKey(['unavailable-dataset', dataset.portal?.id ?? dataset.portal?.apiUrl, dataset.id ?? dataset.name])
}

/** Stops the catalogue offering a dataset: for a day when it was empty or denied, for an hour when it failed. */
export function markDatasetUnavailable(dataset: DatasetIdentity, reason: UnavailableReason) {
  setCache(unavailableKey(dataset), reason, REMEMBER_MS[reason])
  marks++
  for (const listener of listeners) listener()
}

export function isDatasetUnavailable(dataset: DatasetIdentity): boolean {
  return getCache<string>(unavailableKey(dataset)) !== undefined
}

/** A predicate true for datasets still remembered as unavailable, reading storage once instead of per dataset. */
export function unavailableDatasetFilter(): (dataset: DatasetIdentity) => boolean {
  const unavailable = liveKeysWithPrefix(UNAVAILABLE_PREFIX)
  return dataset => unavailable.has(unavailableKey(dataset))
}

/** `unavailableDatasetFilter()`, rebuilt whenever a dataset is marked so a catalogue drops it at once. */
export function useUnavailableDatasetFilter(): (dataset: DatasetIdentity) => boolean {
  const version = React.useSyncExternalStore(subscribe, markCount, markCount)
  return React.useMemo(() => unavailableDatasetFilter(), [version])
}
