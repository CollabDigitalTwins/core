// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { winningPick } from './selectionState'

import type { PointerHits } from '../lib/pickAtPointer'

const hits = (partial: Partial<PointerHits>): PointerHits => ({
  fragment: null, object: null, splat: null, cloud: null, ...partial,
})

describe('winningPick', () => {
  it('takes the nearest hit', () => {
    expect(winningPick(hits({
      fragment: { distance: 9, modelId: 'a.frag', localId: 3 },
      splat: { distance: 2, id: '41' },
    }))).toEqual({ kind: 'splat', fileId: '41' })
  })

  it('gives a tie to the fragment, which draws its own marker', () => {
    expect(winningPick(hits({
      fragment: { distance: 5, modelId: 'a.frag', localId: 3 },
      object: { distance: 5, fileId: '41' },
    }))).toEqual({ kind: 'fragments', modelId: 'a.frag', localId: 3 })
  })

  it('never selects a point cloud, however near it is', () => {
    expect(winningPick(hits({
      cloud: { distance: 1, id: '7' },
      object: { distance: 8, fileId: '41' },
    }))).toEqual({ kind: 'object', fileId: '41' })
  })

  it('returns null when only a cloud was hit', () => {
    expect(winningPick(hits({ cloud: { distance: 1, id: '7' } }))).toBeNull()
  })

  it('ignores a fragment hit with no local id, which cannot be selected', () => {
    expect(winningPick(hits({ fragment: { distance: 1, modelId: 'a.frag' } }))).toBeNull()
  })

  it('returns null when nothing was hit', () => {
    expect(winningPick(hits({}))).toBeNull()
  })
})
