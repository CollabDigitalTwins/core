// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { nearestFragmentHit } from './pickAtPointer'

const model = (distance: number | null, localId = 7) => ({
  raycast: vi.fn(async () => (distance === null ? null : { distance, localId })),
})

describe('nearestFragmentHit', () => {
  const params = { camera: {} as THREE.Camera, mouse: new THREE.Vector2(1, 2), dom: {} as HTMLElement }

  it('returns the nearest model with the local id the selection needs', async () => {
    const list = new Map([['far.frag', model(10, 3)], ['near.frag', model(2, 9)]])
    expect(await nearestFragmentHit(list as never, params)).toEqual({
      modelId: 'near.frag', distance: 2, localId: 9,
    })
  })

  it('ignores models that were not hit', async () => {
    const list = new Map([['a.frag', model(null)], ['b.frag', model(4, 5)]])
    expect(await nearestFragmentHit(list as never, params)).toEqual({
      modelId: 'b.frag', distance: 4, localId: 5,
    })
  })

  it('returns null when nothing was hit', async () => {
    const list = new Map([['a.frag', model(null)]])
    expect(await nearestFragmentHit(list as never, params)).toBeNull()
  })
})
