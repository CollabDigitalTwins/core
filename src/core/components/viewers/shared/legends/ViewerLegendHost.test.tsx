// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'

import { usePluginConfig, usePluginId } from '../../../../plugins/host/scope'
import { usePluginTranslations } from '../../../../plugins/sdk/messages'
import { ViewerNames } from '../../../../types/dbTypes'

import { ViewerLegendHost } from './ViewerLegendHost'

import type { LegendRegistration } from '../../../../plugins/sdk/types'


const { mockToastWarning } = vi.hoisted(() => ({ mockToastWarning: vi.fn() }))
vi.mock('sonner', () => ({ toast: { warning: mockToastWarning } }))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useMessages: () => ({}),
}))

// Only the provider is mocked, so these cover the real scope around each legend hook.
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

afterEach(() => {
  mockContributions.mockReset()
  mockToastWarning.mockReset()
})

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

// One host in both viewers, so a legend has to be able to say where it belongs.
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
    render(<ViewerLegendHost viewer={ViewerNames.bim} />)
    expect(screen.getByText('Office')).toBeInTheDocument()
  })
})

// A legend's hook runs in the host's body, so the scope must be its parent, not a wrapper.
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

describe('an unreachable feed', () => {
  test('warns with a toast keyed to the legend', () => {
    mockContributions.mockReturnValue([
      makeLegend('fires', { active: true, unavailable: true, rows: [] }),
    ])
    render(<ViewerLegendHost viewer={ViewerNames.map} />)

    expect(mockToastWarning).toHaveBeenCalledWith('feedUnavailableToast', { id: 'legend-unavailable-test-plugin:fires' })
  })

  test('stays quiet for a legend that is not active', () => {
    mockContributions.mockReturnValue([
      makeLegend('fires', { active: false, unavailable: true, rows: [] }),
    ])
    render(<ViewerLegendHost viewer={ViewerNames.map} />)

    expect(mockToastWarning).not.toHaveBeenCalled()
  })
})

describe('row switches and controls', () => {
  test('gives a row with onVisibleChange a switch that reports the new state', () => {
    const onVisibleChange = vi.fn()
    mockContributions.mockReturnValue([
      makeLegend('fires', { active: true, rows: [{ label: 'Large', color: '#f00', visible: true, onVisibleChange }] }),
    ])
    render(<ViewerLegendHost viewer={ViewerNames.map} />)

    fireEvent.click(screen.getByRole('switch', { name: 'Large' }))

    expect(onVisibleChange).toHaveBeenCalledWith(false)
  })

  test('leaves a row without onVisibleChange switchless', () => {
    mockContributions.mockReturnValue([
      makeLegend('fires', { active: true, rows: [{ label: 'Large', color: '#f00' }] }),
    ])
    render(<ViewerLegendHost viewer={ViewerNames.map} />)

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  test("renders a plugin's own controls under its rows", () => {
    mockContributions.mockReturnValue([
      makeLegend('fires', { active: true, rows: [], controls: <input aria-label="Month" type="range" /> }),
    ])
    render(<ViewerLegendHost viewer={ViewerNames.map} />)

    expect(screen.getByRole('slider', { name: 'Month' })).toBeInTheDocument()
  })
})

/** Renders the id the host scoped it with, so a mix-up between plugins is visible. */
function useIdLegend() {
  return { active: true, rows: [{ label: usePluginId(), color: '#000' }] }
}
