// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { MenusProvider } from '../../store/Menus/context'
import { SidebarProvider } from '../ui/Sidebar'

import { SupportMenu } from './SupportMenu'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('../ui/ViewerSidebar', () => ({ ViewerSidebar: () => null }))

const matchMedia = (query: string) => ({
  matches: false, media: query, onchange: null,
  addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
})

beforeAll(() => {
  vi.stubGlobal('matchMedia', matchMedia)
})

describe('SupportMenu', () => {
  it('starts the guide from its Guide item', async () => {
    const onOpenGuide = vi.fn()
    render(
      <MenusProvider>
        <SidebarProvider>
          <SupportMenu item={{ title: 'Support' }} isCollapsed={false} onOpenBug={vi.fn()} onOpenFeature={vi.fn()} onOpenGuide={onOpenGuide} />
        </SidebarProvider>
      </MenusProvider>,
    )

    fireEvent.keyDown(screen.getByRole('button', { name: 'Support' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'guide' }))

    await waitFor(() => expect(onOpenGuide).toHaveBeenCalledOnce())
  })
})
