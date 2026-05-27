'use client'
import * as React from 'react'

// Dependencies
import { Button } from './Button'

// Icons
import * as LR from 'lucide-react'

import { useTranslations } from 'next-intl'
import { CdtIcon } from './Icons/CdtIcon'
import Link from 'next/link'
import { Sidebar, useSidebar, NavUser } from './'
import { ViewerNames } from '../../types'
import { useMenusContext } from '../../store'

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

  const { sidebarState, isMobile, openMobile, toggleMenuSidebar } = useSidebar()

  const { currentViewer } = menusState.menus

  // On mobile, treat the sheet open as expanded so labels render when the drawer is visible
  const isCollapsed = isMobile ? !openMobile : sidebarState === 'collapsed'

  // Determine the collapsible type based on the current viewer
  const collapsibleType = currentViewer === ViewerNames.auth ? 'offcanvas' : 'icon'

  return (
    <>
      {/* Always show toggle button on mobile when collapsed */}
      {isMobile && isCollapsed && (
        <div id='sidebar-toggle-button-mobile' className='fixed left-0 top-1/2 -translate-y-1/2 z-[100] flex items-center justify-center pointer-events-auto'>
          <button
            onClick={toggleMenuSidebar}
            className="text-muted-foreground hover:text-primary p-[2px] rounded-r-md bg-sidebar"
            style={{ border: '1px solid rgba(128,128,128,0.2)', borderLeft: 'none', boxShadow: '4px 0 8px -4px rgba(0,0,0,0.12)' }}
          >
            <LR.ChevronRight className="w-5" />
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
        <div className={`w-full flex flex-col ${sidebarState === 'expanded' ? 'items-center justify-center' : 'justify-center'}`}>
          {/*  Nav User */}
          <NavUser signOut={signOut} />
          <Link href="https://collabdt.org/" className={sidebarState === 'expanded' ? 'w-full' : ''} target="_blank" rel="noopener noreferrer">
            <Button
              title={isCollapsed ? t('home') : undefined}
              variant="ghost"
              className={`text-xs scale-[85%] py-0 my-0 w-full ${sidebarState === 'expanded' ? 'flex flex-row items-center justify-center gap-2' : 'flex flex-col items-center'}`}
            >
              {!isCollapsed && <CdtIcon monochromatic={true} />}
              <span className={isCollapsed ? 'hidden' : 'inline'}>{t('home')}</span>
            </Button>
          </Link>
        </div>
      </Sidebar>
    </>
  )
}