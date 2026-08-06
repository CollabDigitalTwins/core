// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import * as LR from 'lucide-react'
import * as React from 'react'

import { resolvePluginIcon, usePluginToolbarTools } from './usePluginToolbarTools'

import type { PluginContribution } from './provider'

const { contributions } = vi.hoisted(() => ({ contributions: { current: [] as unknown[] } }))
vi.mock('./provider', () => ({
  usePluginContributions: () => contributions.current,
}))

type ToolbarContribution = PluginContribution<'bim.tools'>

function contribution(overrides: Partial<ToolbarContribution> = {}): ToolbarContribution {
  return {
    pluginId: 'space-planning',
    id: 'spaces',
    label: 'Spaces',
    icon: 'Ruler',
    component: () => <div>panel</div>,
    ...overrides,
  } as ToolbarContribution
}

/** Renders the mapped tools so assertions read off the DOM, not the array. */
function Probe({ extraProps }: { extraProps?: Record<string, unknown> }) {
  const tools = usePluginToolbarTools('bim.tools', extraProps)
  return (
    <ul>
      {tools.map(tool => (
        <li key={String(tool.id)} data-testid={String(tool.id)}>
          {tool.title}
          {tool.component ? <tool.component tool={tool} {...(tool.extraProps ?? {})} /> : null}
        </li>
      ))}
    </ul>
  )
}

afterEach(() => {
  contributions.current = []
})

test('namespaces the tool id by plugin so two plugins cannot collide', () => {
  contributions.current = [contribution()]

  render(<Probe />)

  expect(screen.getByTestId('plugin:space-planning:spaces')).toBeInTheDocument()
})

test('maps the registration label onto the tool title', () => {
  contributions.current = [contribution({ label: 'Space planning' })]

  render(<Probe />)

  expect(screen.getByText('Space planning')).toBeInTheDocument()
})

test('renders the plugin component with the viewer props passed by the toolbar', () => {
  const seen: Record<string, unknown>[] = []
  contributions.current = [contribution({
    component: (props: Record<string, unknown>) => {
      seen.push(props)
      return <div>panel</div>
    },
  })]

  render(<Probe extraProps={{ viewer: { modelIds: ['a'] } }} />)

  expect(screen.getByText('panel')).toBeInTheDocument()
  expect(seen[0]).toMatchObject({ viewer: { modelIds: ['a'] } })
})

describe('icon resolution', () => {
  it('resolves a lucide icon named as a string', () => {
    expect(resolvePluginIcon('Ruler')).toBe(LR.Ruler)
  })

  it('passes a component through unchanged', () => {
    expect(resolvePluginIcon(LR.Wrench)).toBe(LR.Wrench)
  })

  it('falls back to a placeholder rather than crashing on an unknown name', () => {
    expect(resolvePluginIcon('NotAnIcon')).toBe(LR.Puzzle)
  })
})
