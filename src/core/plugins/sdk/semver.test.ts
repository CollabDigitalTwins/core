// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { compareVersions, highestVersion, isValidVersion } from './semver'

describe('semver', () => {
  it.each([
    ['1.0.0', '1.0.1', -1],
    ['1.10.0', '1.9.0', 1],
    ['2.0.0', '2.0.0', 0],
    ['1.0.0-beta.1', '1.0.0', -1],
    ['1.0.0-beta.2', '1.0.0-beta.10', -1],
    ['1.0.0-alpha', '1.0.0-beta', -1],
    ['1.0.0+build.5', '1.0.0', 0],
  ])('orders %s against %s', (a, b, sign) => {
    expect(Math.sign(compareVersions(a, b))).toBe(sign)
  })

  it('rejects anything that is not MAJOR.MINOR.PATCH', () => {
    expect(isValidVersion('1.2')).toBe(false)
    expect(isValidVersion('v1.2.3')).toBe(false)
    expect(isValidVersion('1.2.3-rc.1')).toBe(true)
  })

  it('picks the highest version rather than the last one', () => {
    expect(highestVersion([{ version: '1.2.0' }, { version: '1.10.0' }, { version: '1.9.9' }])?.version).toBe('1.10.0')
    expect(highestVersion([])).toBeNull()
  })
})
