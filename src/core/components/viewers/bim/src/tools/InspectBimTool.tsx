"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from "react";

// Utilities
import { ToolsContext } from '../../../../../store'
import { BimContext } from '../../../../../store/BIM/context'
import { ToolbarSubmenu } from '../../../../ToolbarSubmenu'
import {
  DropdownMenuItem,
} from '../../../../ui/DropdownMenu'

import type { CursorType } from '../../../../../types/global'
import type { Tool } from '../../../../../types/tools'

// Shadcn components

// Icons


interface InspectToolProps {
  tool: Tool
}

export const InspectBimTool: React.FC<InspectToolProps> = ({ tool }) => {
  // Translation
  const t = useTranslations('InspectBimTool')

  const { dispatch: toolsDispatch, state: toolsState } = React.useContext(ToolsContext)
  const { dispatch: bimDispatch, state: bimState } = React.useContext(BimContext)
  const [active, setActive] = React.useState(false)
  const [inspectType, setInspectType] = React.useState<'line' | 'area'>('line')

  const { world } = bimState.bim
  const toolId = tool.id

  const { currentToolId } = toolsState.tools
  const setTool = (currentToolId) => {
    toolsDispatch({
      type: 'SET-TOOL',
      payload: { currentToolId },
    })
  }

  const getContainer = (): HTMLElement | null => {
    if (typeof window === 'undefined') return null
    return world?.renderer?.three?.domElement || document.querySelector('#bim-viewer-container')
  }

  const setCursor = (cursor: CursorType) => {
    const container = getContainer()
    if (container) {
      container.style.cursor = cursor
    }
  }

  React.useEffect(() => {
    const container = getContainer()
    if (!container) return

    // Click handler for inspect
    const clickHandler = (e): void => {
      if (!active) return
      console.log('clickHandler', e)
    }

    // Mousemove handler for cursor style
    const mousemoveHandler = (e): void => {
      if (!active) return
      console.log('mousemoveHandler', e)
    }

    // Add event listeners
    container.addEventListener('click', clickHandler)
    container.addEventListener('mousemove', mousemoveHandler)

    // Clean up when the component unmounts
    return () => {
      container.removeEventListener('click', clickHandler)
      container.removeEventListener('mousemove', mousemoveHandler)

      container.style.cursor = ''
    }
  }, [active, world])

  // Monitor active state changes
  React.useEffect(() => {
    if (active) {
      // setCursor('crosshair');
    }
    else {
      // setCursor('');
    }
  }, [active])

  // When current tool changes
  React.useEffect(() => {
    setActive(currentToolId === toolId)
  }, [currentToolId, toolId])

  type MeasureType = 'vertices' | 'explode' | 'clip' | 'plans'

  const handleInspectTypeChange = (type: MeasureType) => {
    setInspectType(type as any)

    // If not active, activate the tool
    if (!active) {
      setActive(true)
      setTool(type)
    }
  }

  return (
    <ToolbarSubmenu tool={tool}>
      <DropdownMenuItem onClick={() => handleInspectTypeChange('vertices')} disabled={true}>
        <LR.Scale3D />
        <span>{t('show')}</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleInspectTypeChange('explode')} disabled={true}>
        <LR.UnfoldVertical />
        <span>{t('explode')}</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleInspectTypeChange('clip')} disabled={true}>
        <LR.Crop />
        <span>{t('clipping')}</span>
      </DropdownMenuItem>
    </ToolbarSubmenu>
  )
}
