// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { getNormalizedRoleNames, isAdminUser } from './roles'

describe('getNormalizedRoleNames', () => {
  it('returns an empty array for null / undefined / non-array input', () => {
    expect(getNormalizedRoleNames(null)).toEqual([])
    expect(getNormalizedRoleNames(undefined)).toEqual([])
    expect(getNormalizedRoleNames('admin' as any)).toEqual([])
  })

  it('lowercases and trims role names', () => {
    const result = getNormalizedRoleNames([
      { name: '  Admin  ' } as any,
      { name: 'USER' } as any,
    ])
    expect(result).toEqual(['admin', 'user'])
  })

  it('filters out roles with empty / nullish names', () => {
    const result = getNormalizedRoleNames([
      { name: '' } as any,
      { name: null } as any,
      { name: 'viewer' } as any,
      { name: undefined } as any,
    ])
    expect(result).toEqual(['viewer'])
  })

  it('filters out whitespace-only names', () => {
    expect(getNormalizedRoleNames([{ name: '   ' } as any, { name: 'Viewer' } as any])).toEqual(['viewer'])
  })

  it('handles a role with no name field at all', () => {
    expect(getNormalizedRoleNames([{} as any])).toEqual([])
  })
})

describe('isAdminUser', () => {
  it('returns true when the user has the Admin role (mixed case)', () => {
    expect(isAdminUser([{ name: 'Admin' } as any])).toBe(true)
  })

  it('returns true when the user has the admin role (lowercase)', () => {
    expect(isAdminUser([{ name: 'admin' } as any])).toBe(true)
  })

  it('returns true when the admin role has surrounding whitespace and uppercase', () => {
    expect(isAdminUser([{ name: '  ADMIN  ' } as any])).toBe(true)
    expect(isAdminUser([{ name: 'User' } as any, { name: 'Admin' } as any])).toBe(true)
  })

  it('returns false when the user has no admin role', () => {
    expect(isAdminUser([{ name: 'User' } as any, { name: 'Viewer' } as any])).toBe(false)
  })

  it('returns false for null / undefined / empty role arrays', () => {
    expect(isAdminUser(null)).toBe(false)
    expect(isAdminUser(undefined)).toBe(false)
    expect(isAdminUser([])).toBe(false)
  })
})
