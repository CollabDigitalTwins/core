// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, it, expect } from 'vitest'

import { AppConfigReducer, type AppConfigState } from './reducer'

const base: AppConfigState = { organization: null, user: null }

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
})
