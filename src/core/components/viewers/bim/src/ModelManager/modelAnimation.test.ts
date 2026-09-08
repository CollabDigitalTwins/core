// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import {
  DEFAULT_ANIMATION_STATE,
  MAX_SPEED,
  MIN_SPEED,
  initialState,
  needsFrames,
  withClip,
  withPlaying,
  withSpeed,
} from './modelAnimation'

describe('initialState', () => {
  it('autoplays the first clip when the file has any', () => {
    expect(initialState(2)).toEqual({ clipIndex: 0, playing: true, speed: 1 })
  })

  it('is null for a file with no clips', () => {
    expect(initialState(0)).toBeNull()
  })
})

describe('withClip', () => {
  it('selects a clip in range', () => {
    expect(withClip(DEFAULT_ANIMATION_STATE, 1, 3).clipIndex).toBe(1)
  })

  it('ignores an index outside the clip list', () => {
    const state = { clipIndex: 1, playing: true, speed: 1 }
    expect(withClip(state, 3, 3)).toBe(state)
    expect(withClip(state, -1, 3)).toBe(state)
  })
})

describe('withPlaying', () => {
  it('toggles without touching the clip or speed', () => {
    const paused = withPlaying({ clipIndex: 2, playing: true, speed: 2 }, false)
    expect(paused).toEqual({ clipIndex: 2, playing: false, speed: 2 })
  })
})

describe('withSpeed', () => {
  it('clamps to the offered range', () => {
    expect(withSpeed(DEFAULT_ANIMATION_STATE, 10).speed).toBe(MAX_SPEED)
    expect(withSpeed(DEFAULT_ANIMATION_STATE, 0).speed).toBe(MIN_SPEED)
    expect(withSpeed(DEFAULT_ANIMATION_STATE, 1.5).speed).toBe(1.5)
  })

  it('ignores a non-numeric speed rather than stalling the mixer', () => {
    const state = { clipIndex: 0, playing: true, speed: 1.5 }
    expect(withSpeed(state, Number.NaN)).toBe(state)
  })
})

describe('needsFrames', () => {
  it('is true only while something is playing', () => {
    expect(needsFrames([null, { clipIndex: 0, playing: false, speed: 1 }])).toBe(false)
    expect(needsFrames([null, { clipIndex: 0, playing: true, speed: 1 }])).toBe(true)
    expect(needsFrames([])).toBe(false)
  })
})
