'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as LR from 'lucide-react'
import { useParams, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'

// Utils
import { useUser } from '../../hooks/users/users'
import { useMenusContext } from '../../store'
import { ViewerNames } from '../../types'

import { handleChangeViewer } from './AppSidebar'

// Icons

// Shadcn Components
import {
  Avatar,
} from './Avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './DropdownMenu'
import { SidebarMenuItem, SidebarMenuButton, useSidebar } from './Sidebar'
import { UserAvatar } from './UserAvatar'

export function NavUser({
  signOut
}: {
  signOut: (options?: { redirectTo?: string; redirect?: boolean }) => Promise<void>
}) {
  // Translation
  const t = useTranslations('NavUser')
  const { data: session } = useSession()
  const { user: freshUser } = useUser(session?.user?.id || '')
  const user = freshUser ?? session?.user
  const userName: string | undefined = user?.name ?? 'Unknown User'

  const { dispatch: menusDispatch } = useMenusContext()
  const { setSelectedItem, setSelectedSite, setSelectedFile, setView } = useMenusContext()

  const { isMobile } = useSidebar()

  const params = useParams()

  // Get instance from URL params, defaulting to 'cdt' if not found
  const instance = (params.instance as string) || 'cdt'

  return (
      <SidebarMenuItem className={useSidebar().sidebarState === 'collapsed' ? 'flex justify-center w-full' : ''}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {useSidebar().sidebarState === 'collapsed' ? (
              <SidebarMenuButton size="lg" className="flex justify-center w-full">
                <Avatar className="h-8 w-8 rounded-full overflow-hidden" title={userName}>
                  <UserAvatar imageFileId={(freshUser ?? session?.user as any)?.imageFileId} name={userName} />
                </Avatar>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-full overflow-hidden" title={userName}>
                  <UserAvatar imageFileId={(freshUser ?? session?.user as any)?.imageFileId} name={userName} />
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{userName}</span>
                  <span className="truncate text-xs">{user?.email}</span>
                </div>
                <LR.ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="font-normal">
              <span className="truncate font-semibold">{t('dropdownLabel')}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => handleChangeViewer(ViewerNames.settings, setSelectedItem, setSelectedSite, setSelectedFile, setView, menusDispatch)}
              >
                <LR.Settings className="size-4" />
                {t('settings')}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {/* <DropdownMenuSeparator />  Hide for now. This menu might eventually expand and separator would be necessary */}
            <DropdownMenuItem onClick={() => { void signOut({ redirectTo: `/${instance}/auth/signin`, redirect: true }) }}>
              <LR.LogOut className="size-4" />
              {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
  )
}
