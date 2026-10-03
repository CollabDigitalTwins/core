'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

const activeTimes = new Map<string, string>()
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** The frame a WMS dataset's time control has picked, keyed by dataset name. */
export function setWmsActiveTime(datasetName: string, time: string): void {
  if (activeTimes.get(datasetName) === time) return
  activeTimes.set(datasetName, time)
  listeners.forEach(listener => listener())
}

export function getWmsActiveTime(datasetName: string): string | undefined {
  return activeTimes.get(datasetName)
}

export function useWmsActiveTime(datasetName: string): string | undefined {
  return React.useSyncExternalStore(
    subscribe,
    () => activeTimes.get(datasetName),
    () => undefined,
  )
}
