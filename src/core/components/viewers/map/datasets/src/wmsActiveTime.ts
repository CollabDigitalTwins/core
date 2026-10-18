'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { createKeyedStore } from '../../../../../utils/keyedStore'

const activeTimes = createKeyedStore<string>()

/** The frame a WMS dataset's time control has picked, keyed by dataset name. */
export function setWmsActiveTime(datasetName: string, time: string): void {
  activeTimes.set(datasetName, time)
}

export function getWmsActiveTime(datasetName: string): string | undefined {
  return activeTimes.get(datasetName)
}

export function useWmsActiveTime(datasetName: string): string | undefined {
  return activeTimes.useValue(datasetName)
}
