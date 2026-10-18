// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DatasetLegend } from './DatasetLegend'

import type { Dataset } from '../../../../../../types/datasetTypes'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: { count?: number }) => (values?.count === undefined ? key : `${key}:${values.count}`) }))

const dataset = (changes: Partial<Dataset>) => ({ name: 'Zoning', layerColor: { color: '#000' }, ...changes }) as Dataset

beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline'))) })

describe('DatasetLegend', () => {
  it("shows a map service's labelled entries", () => {
    render(<DatasetLegend dataset={dataset({ legend: { items: [{ label: 'Residential', imageUrl: 'data:image/png;base64,AAA' }] } })} />)
    expect(screen.getByText('Residential')).toBeTruthy()
  })

  it('hides a legend image the server could not draw', async () => {
    render(<DatasetLegend dataset={dataset({ legend: { imageUrl: 'https://x/legend.png' } })} />)
    fireEvent.error(await screen.findByRole('img', { name: 'legend' }))
    expect(screen.queryByRole('img', { name: 'legend' })).toBeNull()
  })

  it('keeps a compact legend short and says how many more there are', () => {
    const categories = Array.from({ length: 12 }, (_, i) => ({ value: `v${i}`, colour: '#123456' }))
    render(<DatasetLegend compact dataset={dataset({ style: { renderer: { kind: 'categorical', field: 'f', categories, otherColour: '#999' }, opacity: 1, strokeColour: '#fff', strokeWidth: 1, strokeOpacity: 1, pointRadius: 6, lineWidth: 3 } })} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(8)
    expect(screen.getByText('moreEntries:5')).toBeTruthy()
  })

  it('shows a legend image it cannot split into entries at its own size', async () => {
    render(<DatasetLegend dataset={dataset({ legend: { imageUrl: 'https://x/legend.png' } })} />)
    const image = await screen.findByRole('img', { name: 'legend' })
    expect(image.className).not.toMatch(/max-h|object-contain/)
  })
})
