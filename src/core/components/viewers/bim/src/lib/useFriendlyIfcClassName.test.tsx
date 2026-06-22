// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import * as React from 'react'
import { renderHook } from '@testing-library/react'

const { mockHas, mockTranslate } = vi.hoisted(() => ({
  mockHas: vi.fn<(key: string) => boolean>(),
  mockTranslate: vi.fn<(key: string) => string>(),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const fn = (key: string) => mockTranslate(key)
    ;(fn as any).has = (key: string) => mockHas(key)
    return fn
  },
}))

import { useFriendlyIfcClassName } from './useFriendlyIfcClassName'

beforeEach(() => {
  mockHas.mockReset()
  mockTranslate.mockReset()
})

describe('useFriendlyIfcClassName', () => {
  it('returns IFC class names verbatim', () => {
    const { result } = renderHook(() => useFriendlyIfcClassName())
    expect(result.current('IFCWALL')).toBe('IFCWALL')
    expect(result.current('IFCSLAB')).toBe('IFCSLAB')
    expect(mockHas).not.toHaveBeenCalled()
  })

  it('looks up non-IFC keys in the DrawingLayers namespace', () => {
    mockHas.mockReturnValue(true)
    mockTranslate.mockReturnValue('Door Swings')
    const { result } = renderHook(() => useFriendlyIfcClassName())
    expect(result.current('door-swings')).toBe('Door Swings')
    expect(mockHas).toHaveBeenCalledWith('door-swings')
    expect(mockTranslate).toHaveBeenCalledWith('door-swings')
  })

  it('falls back to the raw key when the translation key is unknown', () => {
    mockHas.mockReturnValue(false)
    const { result } = renderHook(() => useFriendlyIfcClassName())
    expect(result.current('unknown-key')).toBe('unknown-key')
    expect(mockTranslate).not.toHaveBeenCalled()
  })
})
