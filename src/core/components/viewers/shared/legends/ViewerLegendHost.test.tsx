// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import * as React from 'react'

import { usePluginConfig, usePluginId } from '../../../../plugins/host/scope'
import { usePluginTranslations } from '../../../../plugins/sdk/messages'
import { ViewerNames } from '../../../../types/dbTypes'

import { ViewerLegendHost } from './ViewerLegendHost'

import type { LegendRegistration } from '../../../../plugins/sdk/types'


vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useMessages: () => ({}),
}))

// Only the provider is mocked. `PluginScopeProvider` is the real one, so these tests cover
// the scope the host establishes around each legend's hook.
const { mockContributions } = vi.hoisted(() => ({ mockContributions: vi.fn() }))
vi.mock('../../../../plugins/host/provider', () => ({
  usePluginContributions: () => mockContributions(),
  usePluginConfigs: () => ({ 'test-plugin': { colour: '#123456' } }),
}))

type Contribution = LegendRegistration & { pluginId: string }

function makeLegend(
  id: string,
  result: ReturnType<LegendRegistration['useLegend']>,
): Contribution {
  return { id, title: id, pluginId: 'test-plugin', useLegend: () => result }
}

afterEach(() => mockContributions.mockReset())

test('renders one section per active legend with a count badge', () => {
  mockContributions.mockReturnValue([
    makeLegend('ship', { active: true, rows: [{ label: 'Cargo', color: '#f97316' }] }),
    makeLegend('air', { active: false, rows: [{ label: 'Jet', color: '#000' }] }),
  ])
  render(<ViewerLegendHost viewer={ViewerNames.map} />)
  expect(screen.getByText('Cargo')).toBeInTheDocument()
  expect(screen.queryByText('Jet')).not.toBeInTheDocument()
  expect(screen.getByTestId('map-legend-count')).toHaveTextContent('1')
})

test('hides the card when no legend is active', () => {
  mockContributions.mockReturnValue([
    makeLegend('ship', { active: false, rows: [{ label: 'Cargo', color: '#f97316' }] }),
  ])
  render(<ViewerLegendHost viewer={ViewerNames.map} />)
  expect(screen.queryByTestId('map-legend-card')).not.toBeInTheDocument()
})

// The same host now renders in the map and the BIM viewer, so a legend has to be able to say
// where it belongs — a BIM space legend has no business on the map.
describe('viewer targeting', () => {
  const targeted = (viewers?: ViewerNames[]) => [{
    ...makeLegend('spaces', { active: true, rows: [{ label: 'Office', color: '#000' }] }),
    ...(viewers ? { viewers } : {}),
  }]

  test('shows a legend that names this viewer', () => {
    mockContributions.mockReturnValue(targeted([ViewerNames.bim]))
    render(<ViewerLegendHost viewer={ViewerNames.bim} />)
    expect(screen.getByText('Office')).toBeInTheDocument()
  })

  test('hides a legend that names another viewer', () => {
    mockContributions.mockReturnValue(targeted([ViewerNames.bim]))
    render(<ViewerLegendHost viewer={ViewerNames.map} />)
    expect(screen.queryByText('Office')).not.toBeInTheDocument()
  })

  test('shows an untargeted legend everywhere', () => {
    mockContributions.mockReturnValue(targeted())
    render(<ViewerLegendHost viewer={ViewerNames.pointcloud} />)
    expect(screen.getByText('Office')).toBeInTheDocument()
  })
})

// A legend contributes a hook, and that hook runs in the host's own component body — so the
// scope has to be a parent of it, not a wrapper around the call. Missing that, every scoped
// hook threw, and no shipped legend used one until hello-map did.
describe('the plugin scope around a legend', () => {
  test('lets useLegend call the scoped SDK hooks', () => {
    mockContributions.mockReturnValue([
      {
        id: 'scoped',
        title: 'scoped',
        pluginId: 'test-plugin',
        useLegend: () => {
          const t = usePluginTranslations()
          const { colour } = usePluginConfig<{ colour?: string }>()

          return {
            active: true,
            rows: [{ label: t('row', 'Picked'), color: colour ?? '#000' }],
          }
        },
      } as LegendRegistration & { pluginId: string },
    ])

    render(<ViewerLegendHost viewer={ViewerNames.map} />)

    expect(screen.getByText('Picked')).toBeInTheDocument()
  })

  test('gives each legend its own plugin id', () => {
    mockContributions.mockReturnValue([
      { id: 'a', title: 'a', pluginId: 'alpha', useLegend: () => useIdLegend() },
      { id: 'b', title: 'b', pluginId: 'beta', useLegend: () => useIdLegend() },
    ] as Array<LegendRegistration & { pluginId: string }>)

    render(<ViewerLegendHost viewer={ViewerNames.map} />)

    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.getByText('beta')).toBeInTheDocument()
  })
})

/** Renders the id the host scoped it with, so a mix-up between plugins is visible. */
function useIdLegend() {
  return { active: true, rows: [{ label: usePluginId(), color: '#000' }] }
}
