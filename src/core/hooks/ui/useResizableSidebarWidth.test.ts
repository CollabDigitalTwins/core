// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import {
  MIN_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  DEFAULT_SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_STORAGE_KEY,
  clampSidebarWidth,
  readStoredSidebarWidth,
  writeStoredSidebarWidth,
} from './useResizableSidebarWidth'

describe('clampSidebarWidth', () => {
  it('keeps a value already within bounds', () => {
    expect(clampSidebarWidth(500)).toBe(500)
  })

  it('clamps values below the minimum up to MIN_SIDEBAR_WIDTH', () => {
    expect(clampSidebarWidth(MIN_SIDEBAR_WIDTH - 200)).toBe(MIN_SIDEBAR_WIDTH)
  })

  it('clamps values above the maximum down to MAX_SIDEBAR_WIDTH', () => {
    expect(clampSidebarWidth(MAX_SIDEBAR_WIDTH + 500)).toBe(MAX_SIDEBAR_WIDTH)
  })

  it('falls back to the default for non-finite input', () => {
    expect(clampSidebarWidth(Number.NaN)).toBe(DEFAULT_SIDEBAR_WIDTH)
    expect(clampSidebarWidth(Number.POSITIVE_INFINITY)).toBe(MAX_SIDEBAR_WIDTH)
  })

  it('the default sits within the allowed range', () => {
    expect(DEFAULT_SIDEBAR_WIDTH).toBeGreaterThanOrEqual(MIN_SIDEBAR_WIDTH)
    expect(DEFAULT_SIDEBAR_WIDTH).toBeLessThanOrEqual(MAX_SIDEBAR_WIDTH)
  })
})

describe('read/writeStoredSidebarWidth', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns the default when nothing is stored', () => {
    expect(readStoredSidebarWidth()).toBe(DEFAULT_SIDEBAR_WIDTH)
  })

  it('round-trips a persisted width', () => {
    writeStoredSidebarWidth(560)
    expect(readStoredSidebarWidth()).toBe(560)
  })

  it('clamps an out-of-range stored value on read', () => {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, '9999')
    expect(readStoredSidebarWidth()).toBe(MAX_SIDEBAR_WIDTH)
  })

  it('falls back to the default for a corrupt stored value', () => {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, 'not-a-number')
    expect(readStoredSidebarWidth()).toBe(DEFAULT_SIDEBAR_WIDTH)
  })

  it('persists a clamped value on write', () => {
    writeStoredSidebarWidth(MAX_SIDEBAR_WIDTH + 1000)
    expect(readStoredSidebarWidth()).toBe(MAX_SIDEBAR_WIDTH)
  })
})
