// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { resolveOpenSections } from './resolveOpenSections'

const counts = { bim: 2, pointClouds: 0, models: 1, files: 0 }

describe('resolveOpenSections', () => {
  it('opens a populated section the user has not touched', () => {
    expect(resolveOpenSections({}, counts).bim).toBe(true)
  })

  it('closes an empty section the user has not touched', () => {
    expect(resolveOpenSections({}, counts).pointClouds).toBe(false)
  })

  it('keeps an empty section open once the user opened it', () => {
    expect(resolveOpenSections({ pointClouds: true }, counts).pointClouds).toBe(true)
  })

  it('keeps a populated section closed once the user closed it', () => {
    expect(resolveOpenSections({ bim: false }, counts).bim).toBe(false)
  })
})
