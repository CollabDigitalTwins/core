// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Shadcn Components
import { Settings2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'


import { useIsMobile } from '../../hooks/ui/use-mobile'
import { MenusContext } from '../../store'

import { Menubar } from './Menubar'
import { useSidebar } from './Sidebar'
import ToolbarButton from './ToolbarButton'

import type { Tool } from '../../types/tools'


// Components

export default function SettingsButton() {
  // Translation
  const t = useTranslations('SettingsButton')

  const isMobile = useIsMobile()
  if (isMobile) return null

  const tool: Tool = {
    id: 'settings',
    title: t('title'),
    icon: Settings2,
    stayActive: false,
    height: '6',
  }

  const { setOpenInfo } = useSidebar()

  const { dispatch: menusDispatch } = React.useContext(MenusContext)
  const onclick = () => {
    setOpenInfo(true)
    menusDispatch({ type: 'SET_SIDEBAR_SELECTED_TAB', payload: { selectedTab: 'settings' } })
  }

  return (
    <div className="absolute top-24 right-0 m-[10px] z-10" onClick={onclick}>
      <Menubar className="flex flex-row gap-2 justify-center w-[28.99px] bg-primary-light rounded space-y-0 p-0">
        <ToolbarButton tool={tool} />
      </Menubar>
    </div>
  )
}
