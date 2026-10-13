// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Collab Digital Twins

// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePluginUser } from './user'

const useSessionMock = vi.fn()
vi.mock('next-auth/react', () => ({ useSession: () => useSessionMock() }))

describe('usePluginUser', () => {
  beforeEach(() => useSessionMock.mockReset())

  it('returns only the id and name of the signed-in user', () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: '7', name: 'Ada Lovelace', email: 'ada@example.org', organizationId: 3 } },
    })

    const { result } = renderHook(() => usePluginUser())

    expect(result.current).toEqual({ id: '7', name: 'Ada Lovelace' })
  })

  it('returns null without a session', () => {
    useSessionMock.mockReturnValue({ data: null })

    const { result } = renderHook(() => usePluginUser())

    expect(result.current).toBeNull()
  })
})
