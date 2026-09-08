// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { uniformScale } from './uniformScale'

describe('uniformScale', () => {
  it('keeps an already uniform scale', () => {
    expect(uniformScale(2, 2, 2)).toBe(2)
  })

  it('follows the X handle', () => {
    expect(uniformScale(3, 1, 1)).toBe(3)
  })

  it('follows the Y handle, which used to be ignored', () => {
    expect(uniformScale(1, 3, 1)).toBe(3)
  })

  it('follows the Z handle, which used to be ignored', () => {
    expect(uniformScale(1, 1, 3)).toBe(3)
  })

  it('follows a handle that shrinks the object', () => {
    expect(uniformScale(1, 0.25, 1)).toBe(0.25)
  })

  it('works away from 1, because a DXF starts at its unit conversion', () => {
    expect(uniformScale(0.001, 0.002, 0.001)).toBe(0.002)
  })

  it('takes the last axis when every component differs, rather than guessing', () => {
    expect(uniformScale(2, 3, 4)).toBe(4)
  })

  it('refuses a non-finite or non-positive scale, which would collapse the object', () => {
    expect(uniformScale(Number.NaN, 1, 1)).toBe(1)
    expect(uniformScale(0, 0, 0)).toBe(1)
    expect(uniformScale(-2, 1, 1)).toBe(1)
  })
})
