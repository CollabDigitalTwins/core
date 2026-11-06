// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'

import { useFirstLoadableImage } from './useFirstLoadableImage'

const loadable = new Set<string>()

class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = 0
  set src(value: string) {
    queueMicrotask(() => {
      if (loadable.has(value)) {
        this.naturalWidth = 16
        this.onload?.()
      } else {
        this.onerror?.()
      }
    })
  }
}

beforeEach(() => {
  loadable.clear()
  vi.stubGlobal('Image', FakeImage)
})

afterEach(() => vi.unstubAllGlobals())

describe('useFirstLoadableImage', () => {
  it('skips candidates that fail and returns the first that loads', async () => {
    loadable.add('/b.png').add('/c.png')
    const { result } = renderHook(() => useFirstLoadableImage(['/a.png', undefined, '/b.png', '/c.png']))
    await waitFor(() => expect(result.current).toBe('/b.png'))
  })

  it('stays null when nothing loads', async () => {
    const { result } = renderHook(() => useFirstLoadableImage(['/a.png', '/b.svg']))
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(result.current).toBeNull()
  })

  it('does not re-probe when given an equal array', async () => {
    loadable.add('/a.png')
    const { result, rerender } = renderHook(({ list }) => useFirstLoadableImage(list), {
      initialProps: { list: ['/a.png'] },
    })
    await waitFor(() => expect(result.current).toBe('/a.png'))
    rerender({ list: ['/a.png'] })
    expect(result.current).toBe('/a.png')
  })
})
