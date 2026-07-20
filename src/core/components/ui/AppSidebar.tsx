'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

// Dependencies
import { Button } from './Button'

// Icons
import * as LR from 'lucide-react'

import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { CdtIcon } from './Icons/CdtIcon'
import Link from 'next/link'
import { Sidebar, useSidebar, NavUser } from './'
import { ViewerNames } from '../../types'
import { useMenusContext } from '../../store'
import { BugReportDialog } from '../support/BugReportDialog'
import { FeatureRequestDialog } from '../support/FeatureRequestDialog'

export const handleChangeViewer = (
  viewer: ViewerNames,
  setSelectedItem: React.Dispatch<React.SetStateAction<any>>,
  setSelectedSite: React.Dispatch<React.SetStateAction<any>>,
  setSelectedFile: React.Dispatch<React.SetStateAction<any>>,
  setView: React.Dispatch<React.SetStateAction<'table' | 'detail'>>,
  menusDispatch: any,
) => {
  // Reset selected item, file, & view when changing viewer
  setSelectedItem(null)
  setSelectedSite(null)
  setSelectedFile(null)
  setView('table')

  menusDispatch({
    type: 'SET_VIEWER',
    payload: { currentViewer: viewer },
  })
}

interface AppSidebarProps {
  children?: React.ReactNode
  signOut: (options?: { redirectTo?: string; redirect?: boolean }) => Promise<void>
}

export function AppSidebar({ children, signOut }: AppSidebarProps) {
  // Translations
  const t = useTranslations('AppSidebar')

  const { state: menusState } = useMenusContext()
  const { data: session } = useSession()

  const {
    sidebarState, isMobile, openMobile, toggleMenuSidebar,
    bugReportOpen, setBugReportOpen, featureRequestOpen, setFeatureRequestOpen,
  } = useSidebar()

  const { currentViewer } = menusState.menus

  // On mobile, treat the sheet open as expanded so labels render when the drawer is visible
  const isCollapsed = isMobile ? !openMobile : sidebarState === 'collapsed'

  // Determine the collapsible type based on the current viewer
  const collapsibleType = currentViewer === ViewerNames.auth ? 'offcanvas' : 'icon'

  return (
    <>
      {/* Always show toggle button on mobile when collapsed */}
      {isMobile && isCollapsed && (
        <div
          id="sidebar-toggle-button-mobile"
          className="fixed left-0 bottom-[10px] z-[100] flex items-center justify-center pointer-events-auto"
        >
          <button
            onClick={toggleMenuSidebar}
            className="text-muted-foreground hover:text-primary px-2 py-1.5 rounded-r-lg bg-sidebar"
            style={{
              border: '1px solid rgba(128,128,128,0.2)',
              borderLeft: 'none',
              boxShadow: '4px 0 8px -4px rgba(0,0,0,0.12)',
            }}
          >
            <LR.ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
      <Sidebar collapsible={collapsibleType} className="border-none z-50 shadow-md relative" >
        {/* Sidebar toggle button - right side inside Sidebar */}
        {(sidebarState === 'expanded') && (
          <div id='sidebar-toggle-button' className={`absolute right-2 top-2 flex items-center justify-center pointer-events-auto z-50 ${isMobile ? '' : ''}`}>
            <button onClick={toggleMenuSidebar} className='text-muted-foreground hover:text-primary p-1'>
              <LR.X className='w-5' />
            </button>
          </div>
        )}
        {/* Show collapsed toggle only on desktop */}
        {!isMobile && sidebarState !== 'expanded' && (
          <div id='sidebar-toggle-button' className='absolute -right-1 max-h-1 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto z-50'>
            <button
              onClick={toggleMenuSidebar}
              className="text-muted-foreground hover:text-primary p-0 rounded-md bg-sidebar"
              style={{ borderRight: '1px solid rgba(128,128,128,0.2)', boxShadow: '4px 0 8px -4px rgba(0,0,0,0.12)' }}
            >
              <LR.ChevronRight className="w-4" />
            </button>
          </div>
        )}
        {children}
        <div
          className={`w-full flex flex-col ${
            sidebarState === 'expanded'
              ? 'items-center justify-center'
              : 'justify-center pb-4'
          }`}
        >
            {/* Nav User */}
            <NavUser signOut={signOut} />

            {!isCollapsed ? (
              <Link
                href="https://collabdt.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button
                  title={t('home')}
                  variant="ghost"
                  className="text-xs scale-[85%] py-0 my-0 w-full flex flex-row items-center justify-center gap-2"
                >
                  <CdtIcon monochromatic />
                  <span>{t('home')}</span>
                </Button>
              </Link>
            ) : null}
          </div>
      </Sidebar>

      {/* Rendered outside <Sidebar> (and its mobile Sheet) so they survive the
          Sheet closing — see the SidebarContext comment for why. */}
      <BugReportDialog
        open={bugReportOpen}
        onOpenChange={setBugReportOpen}
        userEmail={session?.user?.email ?? undefined}
        viewer={currentViewer}
      />
      <FeatureRequestDialog
        open={featureRequestOpen}
        onOpenChange={setFeatureRequestOpen}
        userEmail={session?.user?.email ?? undefined}
        viewer={currentViewer}
      />
    </>
  )
}