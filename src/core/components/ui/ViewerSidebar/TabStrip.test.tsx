// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'

import { sidebarPanelId, sidebarTabId } from './sidebarTabs'
import { TabStrip } from './TabStrip'

import type { ViewerSidebarTab } from './sidebarTabs'
import type { SidebarTabKey, SidebarTabType } from '../../../store/Menus/reducer'

// The translation mock echoes the key, so a tab's accessible name is its labelKey.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// Width measurement is covered by useCompactTabStrip's own tests (jsdom reports 0
// for every element, so it cannot exercise the wide path). Drive it directly here.
let compact = false
vi.mock('../../../hooks/ui/useCompactTabStrip', () => ({
  useCompactTabStrip: () => compact,
}))

const MAP_TABS: SidebarTabType[] = ['file', 'layers', 'communication', 'sensors', 'settings']

// The strip takes whole tabs, so a plugin tab can carry its own icon and label.
const asTabs = (ids: SidebarTabKey[]): ViewerSidebarTab[] =>
  ids.map(id => ({ id, content: null }))

function renderStrip(
  tabs: SidebarTabKey[] | ViewerSidebarTab[] = MAP_TABS,
  activeTab: SidebarTabKey = 'file',
) {
  const resolved = tabs.every(tab => typeof tab === 'string')
    ? asTabs(tabs as SidebarTabKey[])
    : tabs as ViewerSidebarTab[]

  const onTabChangeAction = vi.fn()
  const view = render(
    <TabStrip tabs={resolved} activeTab={activeTab} onTabChangeAction={onTabChangeAction} />,
  )
  return { ...view, onTabChangeAction }
}

const tabNamed = (name: string) => screen.getByRole('tab', { name })

beforeEach(() => {
  compact = false
})

describe('TabStrip', () => {
  it('renders one tab per id inside a tablist', () => {
    renderStrip()
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(MAP_TABS.length)
  })

  it('renders only the tabs it is given', () => {
    // The point cloud viewer contributes two.
    renderStrip(['file', 'settings'], 'file')
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(screen.queryByRole('tab', { name: 'sensorsTitle' })).not.toBeInTheDocument()
  })

  it('marks only the active tab as selected', () => {
    renderStrip(MAP_TABS, 'sensors')
    expect(tabNamed('sensorsTitle')).toHaveAttribute('aria-selected', 'true')
    expect(tabNamed('fileLabel')).toHaveAttribute('aria-selected', 'false')
  })

  it('gives the active tab the only keyboard stop', () => {
    renderStrip(MAP_TABS, 'layers')
    expect(tabNamed('layersTitle')).toHaveAttribute('tabindex', '0')
    expect(tabNamed('fileLabel')).toHaveAttribute('tabindex', '-1')
  })

  it('links each tab to its panel', () => {
    renderStrip(MAP_TABS, 'file')
    const tab = tabNamed('fileLabel')
    expect(tab).toHaveAttribute('id', sidebarTabId('file'))
    expect(tab).toHaveAttribute('aria-controls', sidebarPanelId('file'))
  })

  it('reports the clicked tab', () => {
    const { onTabChangeAction } = renderStrip()
    fireEvent.click(tabNamed('settingsTitle'))
    expect(onTabChangeAction).toHaveBeenCalledWith('settings')
  })

  it('shows text labels when there is room', () => {
    renderStrip()
    expect(screen.getByText('communicationTitle')).toBeInTheDocument()
  })

  it('hides text labels when compact but keeps every tab named', () => {
    compact = true
    renderStrip()
    expect(screen.queryByText('communicationTitle')).not.toBeInTheDocument()
    // This is what stops icon-only mode from being a regression: Sensors and
    // Settings stayed distinguishable where "Se..."/"Set..." did not.
    expect(tabNamed('sensorsTitle')).toBeInTheDocument()
    expect(tabNamed('settingsTitle')).toBeInTheDocument()
  })

  describe('keyboard navigation', () => {
    it('moves to the next tab on ArrowRight', () => {
      const { onTabChangeAction } = renderStrip(MAP_TABS, 'file')
      fireEvent.keyDown(tabNamed('fileLabel'), { key: 'ArrowRight' })
      expect(onTabChangeAction).toHaveBeenCalledWith('layers')
    })

    it('moves to the previous tab on ArrowLeft', () => {
      const { onTabChangeAction } = renderStrip(MAP_TABS, 'sensors')
      fireEvent.keyDown(tabNamed('sensorsTitle'), { key: 'ArrowLeft' })
      expect(onTabChangeAction).toHaveBeenCalledWith('communication')
    })

    it('moves focus along with the selection', () => {
      renderStrip(MAP_TABS, 'file')
      fireEvent.keyDown(tabNamed('fileLabel'), { key: 'ArrowRight' })
      expect(tabNamed('layersTitle')).toHaveFocus()
    })

    it('wraps backwards from the first tab to the last', () => {
      const { onTabChangeAction } = renderStrip(MAP_TABS, 'file')
      fireEvent.keyDown(tabNamed('fileLabel'), { key: 'ArrowLeft' })
      expect(onTabChangeAction).toHaveBeenCalledWith('settings')
    })

    it('wraps forwards from the last tab to the first', () => {
      const { onTabChangeAction } = renderStrip(MAP_TABS, 'settings')
      fireEvent.keyDown(tabNamed('settingsTitle'), { key: 'ArrowRight' })
      expect(onTabChangeAction).toHaveBeenCalledWith('file')
    })

    it('jumps to the last tab on End', () => {
      const { onTabChangeAction } = renderStrip(MAP_TABS, 'communication')
      fireEvent.keyDown(tabNamed('communicationTitle'), { key: 'End' })
      expect(onTabChangeAction).toHaveBeenCalledWith('settings')
    })

    it('jumps to the first tab on Home', () => {
      const { onTabChangeAction } = renderStrip(MAP_TABS, 'communication')
      fireEvent.keyDown(tabNamed('communicationTitle'), { key: 'Home' })
      expect(onTabChangeAction).toHaveBeenCalledWith('file')
    })

    it('ignores keys it does not handle', () => {
      const { onTabChangeAction } = renderStrip(MAP_TABS, 'file')
      fireEvent.keyDown(tabNamed('fileLabel'), { key: 'ArrowUp' })
      expect(onTabChangeAction).not.toHaveBeenCalled()
    })
  })

  // A plugin tab has no SIDEBAR_TAB_META entry, and the strip used to index that directly.
  describe('a plugin tab', () => {
    const PLUGIN_TAB: ViewerSidebarTab = {
      id: 'plugin:room-inventory:rooms',
      content: null,
      meta: { icon: () => null, label: 'Rooms' },
    }

    const withPlugin = (): ViewerSidebarTab[] => [...asTabs(['file', 'settings']), PLUGIN_TAB]

    it('renders from its own meta rather than the built-in table', () => {
      renderStrip(withPlugin(), 'file')
      expect(tabNamed('Rooms')).toBeInTheDocument()
    })

    it('takes its turn in the keyboard order', () => {
      const { onTabChangeAction } = renderStrip(withPlugin(), 'settings')
      fireEvent.keyDown(tabNamed('settingsTitle'), { key: 'ArrowRight' })
      expect(onTabChangeAction).toHaveBeenCalledWith('plugin:room-inventory:rooms')
    })

    it('links to its own panel', () => {
      renderStrip(withPlugin(), 'plugin:room-inventory:rooms')
      const tab = tabNamed('Rooms')
      expect(tab).toHaveAttribute('aria-selected', 'true')
      expect(tab).toHaveAttribute('aria-controls', sidebarPanelId('plugin:room-inventory:rooms'))
    })
  })
})
