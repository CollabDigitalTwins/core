// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { buildingDisplayName } from './buildingDisplayName'

describe('buildingDisplayName', () => {
  it('prefers the name', () => {
    expect(buildingDisplayName({ buildingName: 'Hall', buildingAddress: '1 Main St' })).toBe('Hall')
  })

  it('falls back to the address when the name is empty', () => {
    expect(buildingDisplayName({ buildingName: '', buildingAddress: '1 Main St' })).toBe('1 Main St')
  })

  it('is undefined with neither, or no building', () => {
    expect(buildingDisplayName({})).toBeUndefined()
    expect(buildingDisplayName(undefined)).toBeUndefined()
  })
})
