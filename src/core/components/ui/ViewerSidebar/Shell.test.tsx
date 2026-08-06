// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'

import { MenusProvider } from '../../../store/Menus/context'

import { ViewerSidebarShell } from './Shell'

import type { ViewerSidebarTab } from './sidebarTabs'

// The translation mock echoes the key, so a tab's accessible name is its labelKey.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/map',
}))

// jsdom reports 0 width for everything, which would force icon-only mode. Labels
// keep the assertions readable; the measurement itself has its own tests.
vi.mock('../../../hooks/ui/useCompactTabStrip', () => ({
  useCompactTabStrip: () => false,
}))

// The building header is chrome around the tabs, and it pulls in the whole Sidebar
// context. Not the unit under test.
vi.mock('./Header', () => ({
  Header: () => null,
}))

const tab = (id: ViewerSidebarTab['id'], enabled?: boolean): ViewerSidebarTab => ({
  id,
  content: <div>{`${id} panel`}</div>,
  ...(enabled === undefined ? {} : { enabled }),
})

function renderShell(tabs: ViewerSidebarTab[]) {
  const view = render(
    <MenusProvider>
      <ViewerSidebarShell tabs={tabs} />
    </MenusProvider>,
  )
  const rerenderWith = (next: ViewerSidebarTab[]) => view.rerender(
    <MenusProvider>
      <ViewerSidebarShell tabs={next} />
    </MenusProvider>,
  )
  return { ...view, rerenderWith }
}

const selectedTabName = () => screen.getByRole('tab', { selected: true }).getAttribute('aria-label')

describe('ViewerSidebarShell', () => {
  it('opens on the first tab, not the last', () => {
    renderShell([tab('file'), tab('layers'), tab('settings')])
    expect(selectedTabName()).toBe('fileLabel')
    expect(screen.getByText('file panel')).toBeInTheDocument()
  })

  it('renders the panel of the tab the user picks', () => {
    renderShell([tab('file'), tab('layers'), tab('settings')])
    fireEvent.click(screen.getByRole('tab', { name: 'layersTitle' }))
    expect(selectedTabName()).toBe('layersTitle')
    expect(screen.getByText('layers panel')).toBeInTheDocument()
  })

  it('falls back to the first visible tab when the selected one is hidden', () => {
    renderShell([tab('file', false), tab('layers'), tab('settings')])
    expect(selectedTabName()).toBe('layersTitle')
  })

  it('returns to the default tab once permission-gated tabs appear', () => {
    // Permissions load after the first render, so every `ability.can(...)` tab starts
    // hidden and Settings is briefly the only tab left. That transient state must not
    // become the selection, or every viewer opens on Settings.
    const loading = [tab('file', false), tab('layers', false), tab('settings')]
    const loaded = [tab('file', true), tab('layers', true), tab('settings')]

    const { rerenderWith } = renderShell(loading)
    expect(selectedTabName()).toBe('settingsTitle')

    rerenderWith(loaded)
    expect(selectedTabName()).toBe('fileLabel')
  })

  it('keeps an explicit choice when the tab list changes around it', () => {
    const { rerenderWith } = renderShell([tab('file'), tab('layers'), tab('settings')])
    fireEvent.click(screen.getByRole('tab', { name: 'settingsTitle' }))
    expect(selectedTabName()).toBe('settingsTitle')

    rerenderWith([tab('file'), tab('layers'), tab('sensors'), tab('settings')])
    expect(selectedTabName()).toBe('settingsTitle')
  })
})
