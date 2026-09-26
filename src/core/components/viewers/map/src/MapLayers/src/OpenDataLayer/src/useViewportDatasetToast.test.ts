// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useViewportDatasetToast } from './useViewportDatasetToast'

import type { DatasetFeaturesStatus } from './useDatasetFeatures'

vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn() } }))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: { reason?: string }) => (values?.reason ? `${key}: ${values.reason}` : key) }))

afterEach(() => vi.clearAllMocks())

const render = (status: DatasetFeaturesStatus) => renderHook(
  ({ current }) => useViewportDatasetToast('Evergreen – Nova Scotia buildings', current),
  { initialProps: { current: status } },
)

describe('useViewportDatasetToast', () => {
  it('toasts once below min zoom, however often the view changes', () => {
    const { rerender } = render({ kind: 'belowMinZoom', minZoom: 15 })
    rerender({ current: { kind: 'belowMinZoom', minZoom: 15 } })

    expect(toast.info).toHaveBeenCalledTimes(1)
    expect(toast.info).toHaveBeenCalledWith('Evergreen – Nova Scotia buildings', expect.objectContaining({ id: 'viewport-dataset-Evergreen – Nova Scotia buildings', description: 'zoomIn' }))
  })

  it('toasts again after the dataset loaded and the user zoomed back out', () => {
    const { rerender } = render({ kind: 'belowMinZoom', minZoom: 15 })
    rerender({ current: { kind: 'ready' } })
    rerender({ current: { kind: 'belowMinZoom', minZoom: 15 } })

    expect(toast.info).toHaveBeenCalledTimes(2)
  })

  it('toasts a load error with its reason', () => {
    render({ kind: 'error', message: 'Evergreen is not configured on this server' })
    expect(toast.error).toHaveBeenCalledWith('Evergreen – Nova Scotia buildings', expect.objectContaining({ description: 'loadFailed: Evergreen is not configured on this server' }))
  })

  it('stays quiet while loading or ready', () => {
    const { rerender } = render({ kind: 'loading' })
    rerender({ current: { kind: 'ready' } })
    expect(toast.info).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })
})
