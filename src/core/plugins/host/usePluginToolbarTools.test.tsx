// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import * as LR from 'lucide-react'
import * as React from 'react'

import { SubmenuContext } from '../../components/ToolbarSubmenu'

import { usePluginToolbarTools } from './usePluginToolbarTools'


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

function makeProbe() {
  const state = { mounted: 0, cleanups: 0 }
  function Probe() {
    React.useEffect(() => {
      state.mounted += 1
      return () => {
        state.cleanups += 1
      }
    }, [])
    return <div>panel contents</div>
  }
  return { state, Probe }
}

function renderPluginTool(overrides: Partial<ToolbarContribution> = {}) {
  contributions.current = [contribution(overrides)]

  function Harness() {
    const [openSubmenu, setOpenSubmenu] = React.useState<string | null>(null)
    const value = React.useMemo(() => ({ openSubmenu, setOpenSubmenu }), [openSubmenu])
    const [tool] = usePluginToolbarTools('bim.tools')
    const Component = tool.component as React.ComponentType<{ tool: Tool }>
    return (
      <SubmenuContext.Provider value={value}>
        <Component tool={tool} />
      </SubmenuContext.Provider>
    )
  }

  const utils = render(<Harness />)
  return {
    ...utils,
    // Not `getByRole`: an open Radix menu aria-hides the button under test.
    button: () => utils.container.querySelector('button') as HTMLElement,
  }
}

// Radix arms its dismiss listener in a `setTimeout(0)`; a press in the same tick misses it.
async function settle() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}

// jsdom has no `PointerEvent`, and the fallback `Event` carries no `button`, which Radix reads.
function pressButton(element: HTMLElement) {
  fireEvent(element, new MouseEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    button: 0,
  }))
  fireEvent.click(element)
}

test('keeps a stayActive plugin working after its panel is closed', async () => {
  const { state, Probe } = makeProbe()
  const { button } = renderPluginTool({ stayActive: true, component: Probe })
  await settle()

  pressButton(button())
  expect(state.mounted).toBe(1)

  pressButton(button())

  expect(state.cleanups).toBe(0)
  expect(state.mounted).toBe(1)
})

test('hides a stayActive plugin\'s panel while it is closed', async () => {
  const { Probe } = makeProbe()
  const { button } = renderPluginTool({ stayActive: true, component: Probe })
  await settle()

  pressButton(button())
  expect(screen.getByText('panel contents')).toBeVisible()

  pressButton(button())

  expect(screen.getByText('panel contents')).not.toBeVisible()
})

test('still tears down a plugin that did not ask to stay active', async () => {
  const { state, Probe } = makeProbe()
  const { button } = renderPluginTool({ component: Probe })
  await settle()

  pressButton(button())
  expect(state.mounted).toBe(1)

  pressButton(button())

  expect(state.cleanups).toBe(1)
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
