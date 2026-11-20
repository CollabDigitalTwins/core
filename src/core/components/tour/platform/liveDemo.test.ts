// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { holdDemo } from './liveDemo'

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('holdDemo', () => {
  it('starts once for several holds', () => {
    const start = vi.fn(() => () => {})
    const releaseA = holdDemo('once', start)
    const releaseB = holdDemo('once', start)
    expect(start).toHaveBeenCalledTimes(1)
    releaseA()
    releaseB()
    vi.advanceTimersByTime(16)
  })

  it('undoes one frame after the last release', () => {
    const undo = vi.fn()
    const release = holdDemo('undo', () => undo)
    release()
    expect(undo).not.toHaveBeenCalled()
    vi.advanceTimersByTime(16)
    expect(undo).toHaveBeenCalledTimes(1)
  })

  it('keeps the demo alive across a release followed by a hold in the same frame', () => {
    const undo = vi.fn()
    const start = vi.fn(() => undo)
    const releaseA = holdDemo('swap', start)
    releaseA()
    const releaseB = holdDemo('swap', start)
    vi.advanceTimersByTime(50)
    expect(undo).not.toHaveBeenCalled()
    expect(start).toHaveBeenCalledTimes(1)
    releaseB()
    vi.advanceTimersByTime(16)
    expect(undo).toHaveBeenCalledTimes(1)
  })

  it('starts again after it ended', () => {
    const start = vi.fn(() => () => {})
    holdDemo('again', start)()
    vi.advanceTimersByTime(16)
    holdDemo('again', start)()
    vi.advanceTimersByTime(16)
    expect(start).toHaveBeenCalledTimes(2)
  })
})
