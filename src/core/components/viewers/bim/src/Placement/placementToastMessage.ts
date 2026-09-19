// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { PlacementMode } from './PlacementEditor'

export type PlacementToastTone = 'success' | 'error'

export interface PlacementToast {
  tone: PlacementToastTone
  key: string
}

const SAVED_KEY: Record<PlacementMode, string> = {
  translate: 'movedFile',
  rotate: 'rotatedFile',
  scale: 'scaledFile',
}

/** The one place that decides what a finished placement edit says, for every kind of object. */
export function placementToast(mode: PlacementMode, ok: boolean): PlacementToast {
  if (!ok) return { tone: 'error', key: 'saveFailed' }
  return { tone: 'success', key: SAVED_KEY[mode] ?? SAVED_KEY.translate }
}
