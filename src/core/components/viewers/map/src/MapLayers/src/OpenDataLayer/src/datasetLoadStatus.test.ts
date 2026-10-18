// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import * as React from 'react'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DatasetsContext } from '../../../../../../../../store/Datasets/context'
import { isDatasetUnavailable } from '../../../../../datasets/src/unavailableDatasets'

import { clearDatasetLoadStatus, setDatasetLoadStatus, useDatasetLoadStatus, useReportedLoadStatus } from './datasetLoadStatus'

import type { DatasetFeaturesStatus } from './useDatasetFeatures'
import type { Dataset } from '../../../../../../../../types/datasetTypes'

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { info: vi.fn(), error: vi.fn(), warning: vi.fn(), success: vi.fn(), dismiss: vi.fn() }) }))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: { reason?: string }) => (values?.reason ? `${key}: ${values.reason}` : key) }))

const dispatch = vi.fn()
const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(DatasetsContext.Provider, { value: { state: {} as never, dispatch } }, children)

const EVERGREEN = 'Evergreen – Nova Scotia buildings'

afterEach(() => {
  clearDatasetLoadStatus('Parks')
  vi.clearAllMocks()
})

describe('datasetLoadStatus', () => {
  it('lets the layer list follow what the map layer is loading', () => {
    const { result } = renderHook(() => useDatasetLoadStatus('Parks'))
    expect(result.current).toBeUndefined()

    act(() => setDatasetLoadStatus('Parks', { kind: 'loading', progress: { fraction: 0.5 } }))
    expect(result.current).toEqual({ kind: 'loading', progress: { fraction: 0.5 } })

    act(() => clearDatasetLoadStatus('Parks'))
    expect(result.current).toBeUndefined()
  })

  it('reports a layer status, forgets it on unmount, and stops offering a dataset that failed', () => {
    const dataset = { id: 'parks', name: 'Parks' } as Dataset
    const { result } = renderHook(() => useDatasetLoadStatus('Parks'))
    const layer = renderHook(({ status }) => useReportedLoadStatus(dataset, status), { initialProps: { status: { kind: 'error', message: 'HTTP 500' } as const }, wrapper })

    expect(result.current).toEqual({ kind: 'error', message: 'HTTP 500' })
    expect(isDatasetUnavailable(dataset)).toBe(true)

    layer.unmount()
    expect(result.current).toBeUndefined()
  })
})

const renderReported = (status: DatasetFeaturesStatus) => renderHook(
  ({ current }) => useReportedLoadStatus({ id: EVERGREEN, name: EVERGREEN } as Dataset, current),
  { initialProps: { current: status }, wrapper },
)

describe('useReportedLoadStatus notices', () => {
  afterEach(() => clearDatasetLoadStatus(EVERGREEN))

  it('toasts once below min zoom, however often the view changes', () => {
    const { rerender } = renderReported({ kind: 'belowMinZoom', minZoom: 15 })
    rerender({ current: { kind: 'belowMinZoom', minZoom: 15 } })

    expect(toast.info).toHaveBeenCalledTimes(1)
    expect(toast.info).toHaveBeenCalledWith(EVERGREEN, expect.objectContaining({ id: `viewport-dataset-${EVERGREEN}`, description: 'zoomIn' }))
  })

  it('toasts again after the dataset loaded and the user zoomed back out', () => {
    const { rerender } = renderReported({ kind: 'belowMinZoom', minZoom: 15 })
    rerender({ current: { kind: 'ready' } })
    rerender({ current: { kind: 'belowMinZoom', minZoom: 15 } })

    expect(toast.info).toHaveBeenCalledTimes(2)
  })

  it('keeps a dataset that failed for a passing reason, with a plain-language warning', () => {
    renderReported({ kind: 'error', message: 'Failed to fetch' })
    expect(toast.error).toHaveBeenCalledWith(EVERGREEN, expect.objectContaining({ description: 'reason.unreachable' }))
    expect(dispatch).not.toHaveBeenCalled()
    expect(isDatasetUnavailable({ id: EVERGREEN, name: EVERGREEN })).toBe(true)
  })

  it('removes a dataset the publisher refuses, saying why without the raw error', () => {
    renderReported({ kind: 'error', message: 'AJAXError: Forbidden (403): https://maps.example.org/tile/1/2/3' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'REMOVE_DATASET_FROM_MAP', payload: { datasetId: EVERGREEN } })
    expect(toast.error).toHaveBeenCalledWith(EVERGREEN, expect.objectContaining({ id: `viewport-dataset-${EVERGREEN}`, description: 'removed: reason.forbidden' }))
  })

  it('stays quiet while loading or ready', () => {
    const { rerender } = renderReported({ kind: 'loading' })
    rerender({ current: { kind: 'ready' } })
    expect(toast.info).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('removes a dataset that loaded but held nothing to draw', () => {
    renderReported({ kind: 'empty' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'REMOVE_DATASET_FROM_MAP', payload: { datasetId: EVERGREEN } })
    expect(toast.error).toHaveBeenCalledWith(EVERGREEN, expect.objectContaining({ description: 'removed: reason.noData' }))
  })
})
