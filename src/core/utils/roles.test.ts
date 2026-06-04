import { describe, it, expect } from 'vitest'
import { getNormalizedRoleNames, isAdminUser } from './roles'
import { RoleNames } from '../types/global'
import type { Role } from '../types/dbTypes'

const role = (name: string): Role => ({ id: 1, name, permissions: [], orgId: 1 })

describe('getNormalizedRoleNames', () => {
  it('returns [] for nullish / non-array input', () => {
    expect(getNormalizedRoleNames(null)).toEqual([])
    expect(getNormalizedRoleNames(undefined)).toEqual([])
    // @ts-expect-error — exercising the runtime Array.isArray guard
    expect(getNormalizedRoleNames('Admin')).toEqual([])
  })
  it('lowercases and trims role names', () => {
    expect(getNormalizedRoleNames([role(' Admin '), role('USER')])).toEqual(['admin', 'user'])
  })
  it('filters out empty / whitespace-only names', () => {
    expect(getNormalizedRoleNames([role(''), role('   '), role('Viewer')])).toEqual(['viewer'])
  })
})

describe('isAdminUser', () => {
  // Regression guard: getNormalizedRoleNames lowercases, RoleNames.admin is 'Admin' (capital A).
  // Before the fix, the case mismatch made this always return false.
  it('detects the admin role regardless of case/whitespace', () => {
    expect(isAdminUser([role('Admin')])).toBe(true)
    expect(isAdminUser([role('admin')])).toBe(true)
    expect(isAdminUser([role('  ADMIN  ')])).toBe(true)
    expect(isAdminUser([role('User'), role('Admin')])).toBe(true)
    expect(isAdminUser([role(RoleNames.admin)])).toBe(true)
  })
  it('is false for non-admins and nullish input', () => {
    expect(isAdminUser([role('User'), role('Viewer')])).toBe(false)
    expect(isAdminUser([])).toBe(false)
    expect(isAdminUser(null)).toBe(false)
  })
})
