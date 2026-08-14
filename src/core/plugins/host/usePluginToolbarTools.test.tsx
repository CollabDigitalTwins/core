// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import * as LR from 'lucide-react'
import * as React from 'react'

import { resolvePluginIcon, usePluginToolbarTools } from './usePluginToolbarTools'

import type { PluginContribution } from './provider'
import type { Tool } from '../../types/tools'

const { contributions } = vi.hoisted(() => ({ contributions: { current: [] as unknown[] } }))
vi.mock('./provider', () => ({
  usePluginContributions: () => contributions.current,
  usePluginConfigs: () => ({}),
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
        <li key={String(tool.id)} data-testid={String(tool.id)}>{tool.title}</li>
      ))}
    </ul>
  )
}

/** Captures the mapped tools so the props contract can be asserted directly. */
function captureTools(extraProps?: Record<string, unknown>) {
  const captured: Tool[] = []

  function Capture() {
    captured.push(...usePluginToolbarTools('bim.tools', extraProps))
    return null
  }

  render(<Capture />)
  return captured
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

test('attaches the viewer props the toolbar supplied, for ToolbarButton to spread', () => {
  contributions.current = [contribution()]

  const [tool] = captureTools({ modelIds: ['a'], selection: {} })

  expect(tool.extraProps).toMatchObject({ modelIds: ['a'] })
})

test('keeps the registration icon and cursor on the tool', () => {
  contributions.current = [contribution({ icon: 'Ruler', cursor: 'crosshair', stayActive: true })]

  const [tool] = captureTools()

  expect(tool.icon).toBe(LR.Ruler)
  expect(tool.cursor).toBe('crosshair')
  expect(tool.stayActive).toBe(true)
})

test('wraps the plugin component rather than letting it replace the toolbar button', () => {
  // ToolbarButton renders `tool.component` *instead of* a button, so an unwrapped
  // plugin panel would render inline in the toolbar strip and push it off screen.
  // The wrapper supplies the standard button-and-dropdown from the registration.
  contributions.current = [contribution({ component: () => <div>panel</div> })]

  const [tool] = captureTools()

  expect(tool.component).toBeDefined()
  expect(tool.component).not.toBe(contributions.current[0].component)
  expect((tool.component as { displayName?: string }).displayName)
    .toBe('PluginTool(space-planning/spaces)')
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
