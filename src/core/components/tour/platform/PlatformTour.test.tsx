// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { useMenusContext } from '../../../store'
import { MenusProvider } from '../../../store/Menus/context'
import { ViewerNames } from '../../../types/dbTypes'
import { SidebarProvider, useSidebar } from '../../ui/Sidebar'

import { useTourTurn } from '../tourQueue'

import { PlatformTour } from './PlatformTour'

import type { TourStore } from '../tourStore'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('next/navigation', async importOriginal => ({
  ...await importOriginal<typeof import('next/navigation')>(),
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('../../ui/ViewerSidebar', () => ({ ViewerSidebar: () => null }))

vi.mock('../../../store/Permissions/context', async importOriginal => ({
  ...await importOriginal<typeof import('../../../store/Permissions/context')>(),
  usePermissions: () => ({ ability: { can: () => true } }),
}))

vi.mock('./usePluginTourEntries', async importOriginal => {
  const actual = await importOriginal<typeof import('./usePluginTourEntries')>()
  return { ...actual, usePluginTourEntries: () => actual.NO_PLUGIN_ENTRIES }
})

vi.mock('./useMapItemPorts', () => {
  const port = { items: () => [], remove: vi.fn(), openDialog: vi.fn(), closeDialog: vi.fn(), placeAtCentre: vi.fn(), typeIds: () => [], preselectType: vi.fn() }
  return { useCommentPort: () => port, useSensorPort: () => port }
})

const matchMedia =(query: string) => ({
  matches: false, media: query, onchange: null,
  addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
})

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal('matchMedia', matchMedia)
})

afterEach(() => window.history.replaceState({}, '', '/'))

function memoryStore(done: string[] = []): TourStore & { done: Set<string> } {
  const set = new Set(done)
  return { done: set, isDone: id => set.has(id), markDone: id => void set.add(id) }
}

function GuideButton() {
  const { setGuideOpen } = useSidebar()
  return <button type="button" onClick={() => setGuideOpen(true)}>Guide</button>
}

function GoToPlugins() {
  const { dispatch } = useMenusContext()
  return <button type="button" onClick={() => dispatch({ type: 'SET_VIEWER', payload: { currentViewer: ViewerNames.plugins } })}>Plugins page</button>
}

function PluginTourCard({ onDone }: { onDone: () => void }) {
  return useTourTurn() ? <><p>plugin tour</p><button type="button" onClick={onDone}>finish plugin</button></> : null
}

function PluginTour() {
  const [done, setDone] = React.useState(false)
  return done ? null : <PluginTourCard onDone={() => setDone(true)} />
}

function renderTour(store: TourStore, withPlugin = false) {
  return render(
    <MenusProvider>
      <SidebarProvider>
        <GuideButton />
        <GoToPlugins />
        {withPlugin && <PluginTour />}
        <PlatformTour store={store} />
      </SidebarProvider>
    </MenusProvider>,
  )
}

describe('PlatformTour', () => {
  it('opens by itself on a first visit', () => {
    renderTour(memoryStore())
    expect(screen.getByRole('dialog', { name: 'welcome.title' })).toBeInTheDocument()
  })

  it('stays closed once the platform tour is done on this device', () => {
    renderTour(memoryStore(['platform']))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('remembers a hidden tour and reopens it from Guide', () => {
    const store = memoryStore()
    renderTour(store)
    fireEvent.click(screen.getByRole('button', { name: /hide/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(store.done.has('platform')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Guide' }))
    expect(screen.getByRole('dialog', { name: 'welcome.title' })).toBeInTheDocument()
  })

  it('reopens on the tour of the page the person moved to, with a way back to the overview', () => {
    renderTour(memoryStore(['platform']))
    fireEvent.click(screen.getByRole('button', { name: 'Plugins page' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guide' }))
    expect(screen.getByRole('dialog', { name: 'pluginsTour.tabs.title' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /overviewShortcut/ }))
    expect(screen.getByRole('dialog', { name: 'welcome.title' })).toBeInTheDocument()
  })

  it('reopens on the overview on the page a viewer= link loaded', () => {
    window.history.replaceState({}, '', '/?viewer=plugins')
    renderTour(memoryStore(['platform']))
    fireEvent.click(screen.getByRole('button', { name: 'Plugins page' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guide' }))
    expect(screen.getByRole('dialog', { name: 'welcome.title' })).toBeInTheDocument()
  })

  it('continues from the overview into the page tour from its first step, and ends the guide there', () => {
    renderTour(memoryStore())
    fireEvent.click(screen.getByRole('button', { name: 'explore.title' }))
    fireEvent.click(screen.getByRole('button', { name: 'welcome.shortcut.map' }))
    expect(screen.getByRole('dialog', { name: 'viewerTour.map.title' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'legend.title' }))
    fireEvent.click(screen.getByRole('button', { name: 'finish' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('offers the tour of the page the viewer is on from the first card', () => {
    renderTour(memoryStore())
    fireEvent.click(screen.getByRole('button', { name: /welcome\.shortcut\.map/ }))
    expect(screen.getByRole('dialog', { name: 'viewerTour.map.title' })).toBeInTheDocument()
  })

  it('ends on a choice of closer tours, and comes back to it from the one picked', () => {
    renderTour(memoryStore())
    fireEvent.click(screen.getByRole('button', { name: 'explore.title' }))
    fireEvent.click(screen.getByRole('button', { name: /explore\.items\.viewers\.term/ }))
    fireEvent.click(screen.getByRole('button', { name: /viewers\.items\.map\.term/ }))
    expect(screen.getByRole('dialog', { name: 'viewerTour.map.title' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'legend.title' }))
    fireEvent.click(screen.getByRole('button', { name: 'backToOverview' }))
    expect(screen.getByRole('dialog', { name: 'exploreViewers.title' })).toBeInTheDocument()
  })

  it('steps aside for a waiting plugin tour on the plugins section and returns to the same step', () => {
    renderTour(memoryStore(), true)
    fireEvent.click(screen.getByRole('button', { name: 'plugins.title' }))
    expect(screen.queryByText('plugin tour')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /plugins\.items\.open\.term/ }))
    expect(screen.getByText('plugin tour')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'finish plugin' }))
    expect(screen.getByRole('dialog', { name: 'pluginsTour.tabs.title' })).toBeInTheDocument()
  })
})
