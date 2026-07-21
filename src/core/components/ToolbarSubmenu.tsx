'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'

// Utilities
import { Button } from '../components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../components/ui/DropdownMenu'
import { ToolsContext } from '../store'
import { type ToolbarToolType } from '../types/tools'

import type { Tool} from '../types/tools';

// Shadcn components

// Icons

// Context for managing which submenu is open
export const SubmenuContext = React.createContext<{
  openSubmenu: string | null
  setOpenSubmenu: (id: string | null) => void
}>({
      openSubmenu: null,
      setOpenSubmenu: () => {},
    })

export const SubmenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [openSubmenu, setOpenSubmenu] = React.useState<string | null>(null)
  const { state: toolsState } = React.useContext(ToolsContext)
  const { currentToolId } = toolsState?.tools || {}

  // Close all submenus when a tool is activated
  React.useEffect(() => {
    if (currentToolId) {
      setOpenSubmenu(null)
    }
  }, [currentToolId])

  return (
    <SubmenuContext.Provider value={{ openSubmenu, setOpenSubmenu }}>
      {children}
    </SubmenuContext.Provider>
  )
}

interface DropdownToolWrapperProps {
  children: React.ReactNode
  tool: Tool
  open?: boolean
}

export const ToolbarSubmenu: React.FC<DropdownToolWrapperProps> = ({ children, tool }) => {
  const { openSubmenu, setOpenSubmenu } = React.useContext(SubmenuContext)

  // This submenu is open only if it matches the global open submenu
  const isOpen = openSubmenu === tool.id

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Open this submenu and close others
      setOpenSubmenu(tool.id)
    }
    else {
      // Close this submenu
      setOpenSubmenu(null)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          size="default"
          variant="ghost"
          className={`flex flex-row justify-center items-center px-1 pointer-events-auto text-primary-dark ${''
          }`}
          title={tool.title || 'Share'}
        >
          <tool.icon />
          <LR.ChevronDown className={`-ml-2 transition-all duration-200 scale-75 ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
