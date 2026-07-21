"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies

// Open BIM Components
import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'

// Utilities

// Shadcn components

// Icons
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from "react";

import { ToolsContext } from '../../../../../store'
import { BimContext } from '../../../../../store/BIM/context'
import { type ToolbarToolType } from '../../../../../types/tools'
import { ToolbarSubmenu } from '../../../../ToolbarSubmenu'
import {
  DropdownMenuItem,
} from '../../../../ui/DropdownMenu'
import { CurrentWorld } from '../CurrentWorld'

import type { Tool} from '../../../../../types/tools';

interface SelectionToolProps {
  tool: Tool
}

type SelectionToolsType = 'bim-selection-show-all' | 'bim-selection-invert' | 'bim-selection-isolate' | 'bim-selection-focus'

export const SelectionBimTool: React.FC<SelectionToolProps> = ({ tool }) => {
  // Translation
  const t = useTranslations('SelectionBimTool')

  const { dispatch: toolsDispatch, state: toolsState } = React.useContext(ToolsContext)
  const { dispatch: bimDispatch, state: bimState } = React.useContext(BimContext)
  const { bimComponents } = bimState.bim
  const [selectionType, setSelectionType] = React.useState<SelectionToolsType>()
  const [active, setActive] = React.useState<boolean>(false)

  const toolId = tool.id
  const { currentToolId } = toolsState.tools

  const setTools = (currentToolId: ToolbarToolType) => {
    toolsDispatch({
      type: 'SET-TOOL',
      payload: { currentToolId },
    })
  }

  // When current tool changes
  React.useEffect(() => {
    setActive(currentToolId === toolId)
  }, [currentToolId, toolId])

  const handleSelectionTypeChange = async (type: SelectionToolsType) => {
    setSelectionType(type as any)
    if (!bimComponents) return

    const { world } = bimComponents.get(CurrentWorld)
    const hider = bimComponents.get(OBC.Hider)
    const fragments = bimComponents.get(OBC.FragmentsManager)



    const bbox = bimComponents.get(OBC.BoundingBoxer)
    if (!(world && fragments )) return

    switch (type) {
      case 'bim-selection-show-all':

        break
      case 'bim-selection-invert':

        break
      case 'bim-selection-isolate':

        break
      case 'bim-selection-focus':

        break
      default:
        break
    }

    if (!active) {
      setActive(true)
      setTools(toolId)
    }
  }

  return (
    <ToolbarSubmenu tool={tool}>
      <DropdownMenuItem onClick={() => handleSelectionTypeChange('bim-selection-show-all')} disabled={true}>
        <LR.Eye />
        <span>{t('show')}</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleSelectionTypeChange('bim-selection-invert')} disabled={true}>
        <LR.ArrowUpDown />
        <span>{t('invert')}</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleSelectionTypeChange('bim-selection-isolate')} disabled={true}>
        <LR.Funnel />
        <span>{t('isolate')}</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleSelectionTypeChange('bim-selection-focus')} disabled={true}>
        <LR.Focus />
        <span>{t('focus')}</span>
      </DropdownMenuItem>
    </ToolbarSubmenu>
  )
}