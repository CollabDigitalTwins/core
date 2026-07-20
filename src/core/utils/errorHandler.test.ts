// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock sonner so the toast call is observable and no real UI dep loads in node env.
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

import { toast } from 'sonner'

import { handleApiError } from './errorHandler'

const toastError = vi.mocked(toast.error)

describe('handleApiError', () => {
  beforeEach(() => toastError.mockClear())

  it('toasts "Permission denied" + returns true on a 401', () => {
    expect(handleApiError({ status: 401 })).toBe(true)
    expect(toastError).toHaveBeenCalledWith('Permission denied')
  })

  it('returns false and does not toast for non-401 / missing status', () => {
    expect(handleApiError({ status: 500 })).toBe(false)
    expect(handleApiError(null)).toBe(false)
    expect(handleApiError(undefined)).toBe(false)
    expect(toastError).not.toHaveBeenCalled()
  })
})
