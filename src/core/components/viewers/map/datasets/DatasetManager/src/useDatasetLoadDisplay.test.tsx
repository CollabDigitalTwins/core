// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { clearDatasetLoadStatus, setDatasetLoadStatus } from '../../../src/MapLayers/src/OpenDataLayer/src/datasetLoadStatus'

import { useDatasetLoadDisplay } from './useDatasetLoadDisplay'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))

function Row() {
  const { indicator, summary } = useDatasetLoadDisplay('Parks')
  return <div>{indicator}<span>{summary}</span></div>
}

afterEach(() => clearDatasetLoadStatus('Parks'))

describe('useDatasetLoadDisplay', () => {
  it('shows a progress ring for every load, then what arrived', () => {
    render(<Row />)
    act(() => setDatasetLoadStatus('Parks', { kind: 'loading', progress: { featureCount: 50, totalFeatureCount: 200, fraction: 0.25 } }))
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('25')
    expect(screen.getByText('25%')).toBeTruthy()
    expect(screen.getByText('featuresOf')).toBeTruthy()

    act(() => setDatasetLoadStatus('Parks', { kind: 'ready', featureCount: 200, bytes: 2_000_000 }))
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.getByText('featuresSoFar · 2.0 MB')).toBeTruthy()
  })

  it('warns when the dataset came back with nothing to draw', () => {
    render(<Row />)
    act(() => setDatasetLoadStatus('Parks', { kind: 'empty' }))
    expect(screen.getByRole('img', { name: 'reason.noData' })).toBeTruthy()
  })

  it('explains a failed load in plain words instead of the raw error', () => {
    render(<Row />)
    act(() => setDatasetLoadStatus('Parks', { kind: 'error', message: 'TypeError: Failed to fetch' }))
    expect(screen.getByRole('img', { name: 'reason.unreachable' })).toBeTruthy()
    expect(screen.queryByText(/Failed to fetch/)).toBeNull()
  })
})
