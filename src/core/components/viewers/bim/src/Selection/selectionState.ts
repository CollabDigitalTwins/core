// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { PointerHits } from '../lib/pickAtPointer'
import type * as OBC from '@thatopen/components'

export type SceneSelection =
  | { kind: 'fragments', items: OBC.ModelIdMap }
  | { kind: 'object' | 'splat', fileId: string }
  | null

export interface WinningPick {
  kind: 'fragments' | 'object' | 'splat'
  modelId?: string
  localId?: number
  fileId?: string
}

/** The selectable hit nearest the camera. Point clouds are never selectable, so they never win. */
export function winningPick(hits: PointerHits): WinningPick | null {
  const candidates: { distance: number, pick: WinningPick }[] = []
  const { fragment, object, splat } = hits

  if (fragment?.modelId && fragment.localId !== undefined) {
    candidates.push({
      distance: fragment.distance,
      pick: { kind: 'fragments', modelId: fragment.modelId, localId: fragment.localId },
    })
  }
  if (object) candidates.push({ distance: object.distance, pick: { kind: 'object', fileId: object.fileId } })
  if (splat) candidates.push({ distance: splat.distance, pick: { kind: 'splat', fileId: splat.id } })

  let winner: WinningPick | null = null
  let nearest = Infinity
  for (const candidate of candidates) {
    if (candidate.distance >= nearest) continue
    winner = candidate.pick
    nearest = candidate.distance
  }
  return winner
}

/** Whether two selections name the same thing, so an unchanged click publishes nothing. */
export function sameSelection(a: SceneSelection, b: SceneSelection): boolean {
  if (a === null || b === null) return a === b
  if (a.kind === 'fragments' || b.kind === 'fragments') return false
  return a.fileId === b.fileId
}
