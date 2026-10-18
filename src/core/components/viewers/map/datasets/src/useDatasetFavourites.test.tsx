// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import * as React from 'react'
import { SWRConfig } from 'swr'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { favouriteKey, favouriteSnapshot, useDatasetFavourites } from './useDatasetFavourites'

import type { Dataset } from '../../../../../types/datasetTypes'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const dataset = (overrides: Partial<Dataset>) => ({ name: 'Parks', dataManagementSystem: 'Ckan', ...overrides }) as Dataset

describe('favouriteKey', () => {
  it('keys portal datasets by system, portal and id', () => {
    expect(favouriteKey(dataset({ id: 'abc', portal: { id: 4 } as Dataset['portal'] }))).toBe('Ckan:4:abc')
  })

  it('keys a portal-less map service by its endpoint and layer', () => {
    expect(favouriteKey(dataset({ mapService: { kind: 'wms', url: 'https://x/wms', layer: 'roads' } }))).toBe('service:wms:https://x/wms:roads')
  })

  it('cannot keep a session-only upload', () => {
    expect(favouriteKey(dataset({ id: 'local-123' }))).toBeNull()
  })
})

describe('favouriteSnapshot', () => {
  it('records how to rebuild datasets that have no portal', () => {
    const service = { kind: 'xyz' as const, url: 'https://t/{z}/{x}/{y}.png' }
    expect(favouriteSnapshot(dataset({ mapService: service }))).toEqual({ mapService: service })
    expect(favouriteSnapshot(dataset({ id: 'url-arcgis:https://x/FeatureServer/0', url: 'https://x/FeatureServer/0' }))).toEqual({ arcgisUrl: 'https://x/FeatureServer/0' })
  })

  it('stores nothing for portal datasets, which reload with their portal', () => {
    expect(favouriteSnapshot(dataset({ portal: { id: 4 } as Dataset['portal'], mapService: { kind: 'wms', url: 'u' } }))).toBeUndefined()
  })
})

describe('useDatasetFavourites', () => {
  const parks = dataset({ id: 'parks', portal: { id: 4 } as Dataset['portal'] })
  const trees = dataset({ id: 'trees', name: 'Trees', portal: { id: 4 } as Dataset['portal'] })
  const wrapper = ({ children }: { children: React.ReactNode }) => <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => Promise.resolve(init?.method
      ? new Response(null, { status: 204 })
      : new Response(JSON.stringify({ favourites: [] }), { headers: { 'content-type': 'application/json' } }))))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('keeps both of two favourites toggled before either save returns', async () => {
    const { result } = renderHook(() => useDatasetFavourites([parks, trees]), { wrapper })
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    act(() => {
      result.current.toggleFavourite(parks)
      result.current.toggleFavourite(trees)
    })

    await waitFor(() => expect(result.current.favourites.map(d => d.id)).toEqual(['parks', 'trees']))
  })

  it('does not rebuild snapshots again when the candidates change but the missing favourites do not', async () => {
    const service = { kind: 'xyz' as const, url: 'https://t/{z}/{x}/{y}.png' }
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      favourites: [{ datasetKey: 'service:xyz:https://t/{z}/{x}/{y}.png:', name: 'Tiles', snapshot: { mapService: service } }],
    }), { headers: { 'content-type': 'application/json' } })))
    const { result, rerender } = renderHook(({ candidates }) => useDatasetFavourites(candidates), { wrapper, initialProps: { candidates: [parks] } })
    await waitFor(() => expect(result.current.favourites).toHaveLength(1))
    const rebuilt = result.current.favourites[0]

    rerender({ candidates: [parks, trees] })
    await act(async () => {})

    expect(result.current.favourites[0]).toBe(rebuilt)
  })
})
