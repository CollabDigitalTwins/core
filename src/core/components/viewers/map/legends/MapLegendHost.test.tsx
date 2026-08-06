// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import * as React from 'react'

import { MapLegendHost } from './MapLegendHost'

import type { LegendRegistration } from '../../../../plugins/sdk/types'


vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

const { mockContributions } = vi.hoisted(() => ({ mockContributions: vi.fn() }))
vi.mock('../../../../plugins/host/provider', () => ({
  usePluginContributions: () => mockContributions(),
}))

function makeLegend(
  id: string,
  result: ReturnType<LegendRegistration['useLegend']>,
): LegendRegistration {
  return { id, title: id, useLegend: () => result }
}

afterEach(() => mockContributions.mockReset())

test('renders one section per active legend with a count badge', () => {
  mockContributions.mockReturnValue([
    makeLegend('ship', { active: true, rows: [{ label: 'Cargo', color: '#f97316' }] }),
    makeLegend('air', { active: false, rows: [{ label: 'Jet', color: '#000' }] }),
  ])
  render(<MapLegendHost />)
  expect(screen.getByText('Cargo')).toBeInTheDocument()
  expect(screen.queryByText('Jet')).not.toBeInTheDocument()
  expect(screen.getByTestId('map-legend-count')).toHaveTextContent('1')
})

test('hides the card when no legend is active', () => {
  mockContributions.mockReturnValue([
    makeLegend('ship', { active: false, rows: [{ label: 'Cargo', color: '#f97316' }] }),
  ])
  render(<MapLegendHost />)
  expect(screen.queryByTestId('map-legend-card')).not.toBeInTheDocument()
})
