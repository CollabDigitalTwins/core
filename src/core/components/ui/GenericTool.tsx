"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as React from "react";
import { useTranslations } from 'next-intl'

// Utilities
import type { Tool, ToolbarToolType } from '../../types/tools'

// Shadcn components
import { Button } from './Button'

// Icons
import * as LR from 'lucide-react'
import { ToolsContext } from '../../store'

interface GenericTool {
  tool: Tool
}

export const GenericTool: React.FC<GenericTool> = ({ tool }) => {
  // Translation
  const t = useTranslations('GenericTool')
  const { dispatch: toolsDispatch, state: toolsState } = React.useContext(ToolsContext)
  const [active, setActive] = React.useState(false)

  const setTools = (currentToolId: ToolbarToolType) => {
    toolsDispatch({
      type: 'SET-TOOL',
      payload: { currentToolId },
    })
  }

  const handleClick = async () => {
    try {
      // TODO: Implement explode by level functionality
      if (!active) {
            setActive(true)
            setTools(tool.id as ToolbarToolType)
          }

    }
    catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      className="flex justify-center items-center h-9 w-9 pointer-events-auto"
      onClick={handleClick}
      title={`${tool.title} (${t('comingSoon')})`}
      disabled={tool.disabled}
    >
      <tool.icon />
    </Button>
  )
}