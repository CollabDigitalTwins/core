// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DatasetsContext } from '../../../../../../store'

import { DatasetStylePanel } from './DatasetStylePanel'

import type { Dataset } from '../../../../../../types/datasetTypes'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}))

const dataset = {
  name: 'Parks',
  layerColor: { color: '#0d9488' },
  layerType: 'fill',
  fields: [],
  getFeatures: async () => ({ type: 'FeatureCollection', features: [] }),
  getFields: async () => [],
} as unknown as Dataset

vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
})

function renderPanel() {
  render(
    <DatasetsContext.Provider value={{ state: {}, dispatch: vi.fn() } as never}>
      <DatasetStylePanel dataset={dataset} />
    </DatasetsContext.Provider>,
  )
}

beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline'))) })

describe('DatasetStylePanel', () => {
  it('shows colouring first and keeps the finer settings behind a toggle', () => {
    renderPanel()
    expect(screen.getByText('colourBy')).toBeTruthy()
    expect(screen.queryByText('opacity')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'moreStyle' }))

    expect(screen.getByText('opacity')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'lessStyle' }).getAttribute('aria-expanded')).toBe('true')
  })

  it("shows a map service's legend inside the panel", async () => {
    const raster = { ...dataset, datasetType: 'WMS', type: 'WMS', legend: { imageUrl: 'https://x/legend.png' } } as unknown as Dataset
    render(
      <DatasetsContext.Provider value={{ state: {}, dispatch: vi.fn() } as never}>
        <DatasetStylePanel dataset={raster} />
      </DatasetsContext.Provider>,
    )
    expect(await screen.findByRole('img', { name: 'legend' })).toBeTruthy()
  })
})
