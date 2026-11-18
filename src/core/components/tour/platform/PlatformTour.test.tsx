// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { MenusProvider } from '../../../store/Menus/context'
import { SidebarProvider, useSidebar } from '../../ui/Sidebar'

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

const matchMedia = (query: string) => ({
  matches: false, media: query, onchange: null,
  addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
})

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal('matchMedia', matchMedia)
})

function memoryStore(done: string[] = []): TourStore & { done: Set<string> } {
  const set = new Set(done)
  return { done: set, isDone: id => set.has(id), markDone: id => void set.add(id) }
}

function GuideButton() {
  const { setGuideOpen } = useSidebar()
  return <button type="button" onClick={() => setGuideOpen(true)}>Guide</button>
}

function renderTour(store: TourStore) {
  return render(
    <MenusProvider>
      <SidebarProvider>
        <GuideButton />
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

  it('branches into a closer tour from an item and comes back to the step it left', () => {
    renderTour(memoryStore())
    fireEvent.click(screen.getByRole('button', { name: 'viewers.title' }))
    fireEvent.click(screen.getByRole('button', { name: /viewers\.items\.map\.term/ }))
    expect(screen.getByRole('dialog', { name: 'viewerTour.map.title' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'tools.map-share.title' }))
    fireEvent.click(screen.getByRole('button', { name: 'backToOverview' }))
    expect(screen.getByRole('dialog', { name: 'viewers.title' })).toBeInTheDocument()
  })
})
