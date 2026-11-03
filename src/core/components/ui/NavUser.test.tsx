// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { NavUser } from './NavUser'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: '1', name: 'Ada', email: 'ada@acme.org' } } }) }))
vi.mock('next/navigation', () => ({ useParams: () => ({ instance: 'acme' }), useSearchParams: () => new URLSearchParams() }))
vi.mock('../../hooks/users/users', () => ({ useUser: () => ({ user: null }) }))
vi.mock('../../store', () => ({ useMenusContext: () => ({ dispatch: vi.fn() }) }))
vi.mock('./AppSidebar', () => ({ handleChangeViewer: vi.fn() }))
vi.mock('./UserAvatar', () => ({ UserAvatar: () => null }))
vi.mock('./Avatar', () => ({ Avatar: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }))
vi.mock('./Sidebar', () => ({
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenuButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  useSidebar: () => ({ isMobile: false, sidebarState: 'expanded' }),
}))
vi.mock('./DropdownMenu', () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>
  const Item = ({ children }: { children?: React.ReactNode }) => <div role="menuitem">{children}</div>
  return { DropdownMenu: Pass, DropdownMenuTrigger: Pass, DropdownMenuContent: Pass, DropdownMenuGroup: Pass, DropdownMenuLabel: Pass, DropdownMenuSeparator: () => null, DropdownMenuItem: Item }
})

describe('NavUser', () => {
  it('renders extra user menu items between Settings and Logout', () => {
    render(<NavUser signOut={vi.fn()} userMenuItems={<div role="menuitem">Usage</div>} />)

    const labels = screen.getAllByRole('menuitem').map(item => item.textContent)

    expect(labels).toEqual(['settings', 'Usage', 'logout'])
  })

  it('renders only Settings and Logout without extra items', () => {
    render(<NavUser signOut={vi.fn()} />)

    expect(screen.getAllByRole('menuitem').map(item => item.textContent)).toEqual(['settings', 'logout'])
  })
})
