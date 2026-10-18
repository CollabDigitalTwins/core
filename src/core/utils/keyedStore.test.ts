// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createKeyedStore } from './keyedStore'

describe('createKeyedStore', () => {
  it('lets a component follow one key from first write to delete', () => {
    const store = createKeyedStore<number>()
    const { result } = renderHook(() => store.useValue('a'))
    expect(result.current).toBeUndefined()

    act(() => store.set('a', 1))
    expect(result.current).toBe(1)
    expect(store.get('a')).toBe(1)

    act(() => store.delete('a'))
    expect(result.current).toBeUndefined()
  })

  it('does not re-render readers of another key', () => {
    const store = createKeyedStore<number>()
    let renders = 0
    renderHook(() => {
      renders += 1
      return store.useValue('b')
    })
    const before = renders

    act(() => store.set('a', 1))
    expect(renders).toBe(before)
  })

  it('does not re-render when the same value is written again', () => {
    const store = createKeyedStore<{ n: number }>()
    const value = { n: 1 }
    act(() => store.set('a', value))
    let renders = 0
    renderHook(() => {
      renders += 1
      return store.useValue('a')
    })
    const before = renders

    act(() => store.set('a', value))
    expect(renders).toBe(before)
  })
})
