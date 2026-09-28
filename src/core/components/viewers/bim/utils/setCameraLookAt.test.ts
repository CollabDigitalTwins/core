// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

import { setCameraLookAt } from './setCameraLookAt'

import type * as OBC from '@thatopen/components'

const worldWith = (setLookAt: ReturnType<typeof vi.fn>) => ({ camera: { controls: { setLookAt } } }) as unknown as OBC.World

describe('setCameraLookAt', () => {
  it('applies a shared camera even when a coordinate is zero', () => {
    const setLookAt = vi.fn()
    const result = setCameraLookAt(worldWith(setLookAt), new URLSearchParams('camX=10&camY=5&camZ=0&tarX=0&tarY=0&tarZ=0'))

    expect(setLookAt).toHaveBeenCalledWith(10, 5, 0, 0, 0, 0, true)
    expect(result.sharing).toBe(true)
  })

  it('falls back to the default view when any coordinate is missing or not a number', () => {
    const setLookAt = vi.fn()
    const result = setCameraLookAt(worldWith(setLookAt), new URLSearchParams('camX=10&camY=5&camZ=abc&tarX=0&tarY=0'))

    expect(setLookAt).toHaveBeenCalledWith(20, 40, 40, -30, 10, -5, true)
    expect(result.sharing).toBe(false)
  })
})
