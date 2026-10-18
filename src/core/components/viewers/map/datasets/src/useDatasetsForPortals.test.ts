// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { fetchArcGISDatasets } from './arcgisDatasets'
import { markDatasetUnavailable } from './unavailableDatasets'
import { useDatasetsForPortals } from './useDatasetsForPortals'

import type { Dataset, DatasetListener } from '../../../../../types/datasetTypes'
import type { OpenDataPortal } from '../../../../../types/dbTypes'

vi.mock('./arcgisDatasets', () => ({ fetchArcGISDatasets: vi.fn() }))
vi.mock('./ckanDatasets', () => ({ fetchCkanDatasets: vi.fn() }))
vi.mock('./localDatasets', () => ({ fetchLocalDatasets: vi.fn() }))
vi.mock('./opendatasoftDatasets', () => ({ fetchOpenDataSoftDatasets: vi.fn() }))
vi.mock('./socrataDatasets', () => ({ fetchSocrataDatasets: vi.fn() }))

const portals = [{ id: 1, name: 'City', apiUrl: 'https://gis.example.org', dataManagementSystem: 'Arcgis' }] as unknown as OpenDataPortal[]
const parks = { id: 'parks', name: 'Parks' } as Dataset
const trees = { id: 'trees', name: 'Trees' } as Dataset

describe('useDatasetsForPortals', () => {
  it('shows datasets as a portal reports them, before it finishes', async () => {
    let finish!: (datasets: Dataset[]) => void
    vi.mocked(fetchArcGISDatasets).mockImplementation((_portal, onDatasets) => {
      (onDatasets as DatasetListener)([parks])
      return new Promise((resolve) => { finish = resolve })
    })

    const { result } = renderHook(() => useDatasetsForPortals(portals))

    await waitFor(() => expect(result.current.datasets).toEqual([parks]))
    expect(result.current.isLoading).toBe(true)

    act(() => finish([parks, trees]))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.datasets).toEqual([parks, trees])
  })

  it('leaves out datasets that recently failed to load', async () => {
    const broken = { id: 'broken', name: 'Broken' } as Dataset
    markDatasetUnavailable(broken, 'failed')
    vi.mocked(fetchArcGISDatasets).mockResolvedValue([parks, broken])

    const { result } = renderHook(() => useDatasetsForPortals(portals))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.datasets).toEqual([parks])
  })

  it('drops a dataset from the open catalogue the moment it is marked unavailable', async () => {
    const denied = { id: 'denied', name: 'Denied' } as Dataset
    vi.mocked(fetchArcGISDatasets).mockResolvedValue([parks, denied])

    const { result } = renderHook(() => useDatasetsForPortals(portals))
    await waitFor(() => expect(result.current.datasets).toEqual([parks, denied]))

    act(() => markDatasetUnavailable(denied, 'denied'))

    expect(result.current.datasets).toEqual([parks])
  })
})
