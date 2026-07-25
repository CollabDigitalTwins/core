// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, it, expect } from 'vitest'

import { AppConfigReducer, type AppConfigState } from './reducer'

const base: AppConfigState = {
  organization: null,
  user: null,
  displayTimeZone: 'UTC',
  displayTimeZoneUserSet: false,
}

describe('AppConfigReducer', () => {
  it('SET_ORGANIZATION sets organization without touching user, returning a new object', () => {
    const organization = { id: 1, name: 'Acme' } as unknown as NonNullable<AppConfigState['organization']>
    const next = AppConfigReducer(base, { type: 'SET_ORGANIZATION', payload: { organization } } as never)
    expect(next.organization).toBe(organization)
    expect(next.user).toBeNull()
    expect(next).not.toBe(base) // no mutation of the input state
  })

  it('SET_USER sets user', () => {
    const user = { id: 1 } as unknown as NonNullable<AppConfigState['user']>
    const next = AppConfigReducer(base, { type: 'SET_USER', payload: { user } } as never)
    expect(next.user).toBe(user)
    expect(next.organization).toBeNull()
  })

  it('returns the same state reference for an unknown action', () => {
    const next = AppConfigReducer(base, { type: 'NOPE' } as never)
    expect(next).toBe(base)
  })

  it('SET_DISPLAY_TIME_ZONE sets the zone and marks it user-set', () => {
    const next = AppConfigReducer(base, {
      type: 'SET_DISPLAY_TIME_ZONE',
      payload: { displayTimeZone: 'America/Toronto' },
    } as never)
    expect(next.displayTimeZone).toBe('America/Toronto')
    expect(next.displayTimeZoneUserSet).toBe(true)
    expect(next.organization).toBeNull()
  })

  it('SET_DEFAULT_TIME_ZONE sets the zone without marking user-set, and is ignored once user-set', () => {
    const afterDefault = AppConfigReducer(base, { type: 'SET_DEFAULT_TIME_ZONE', payload: { displayTimeZone: 'Etc/GMT+5' } } as never)
    expect(afterDefault.displayTimeZone).toBe('Etc/GMT+5')
    expect(afterDefault.displayTimeZoneUserSet).toBe(false)
    const userSet = AppConfigReducer(afterDefault, { type: 'SET_DISPLAY_TIME_ZONE', payload: { displayTimeZone: 'UTC' } } as never)
    const ignored = AppConfigReducer(userSet, { type: 'SET_DEFAULT_TIME_ZONE', payload: { displayTimeZone: 'Etc/GMT+9' } } as never)
    expect(ignored.displayTimeZone).toBe('UTC')
  })
})
