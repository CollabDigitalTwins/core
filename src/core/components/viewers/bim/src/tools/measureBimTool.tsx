"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as React from "react";
import { useTranslations } from 'next-intl'
import * as OBF from "@thatopen/components-front"
// Utilities
import { ToolsContext } from '../../../../../store'
import { CursorType } from '../../../../../types/global'
import { Tool, type ToolbarToolType } from '../../../../../types/tools'

// Shadcn components
import {
  DropdownMenuItem,
} from '../../../../ui/DropdownMenu'

// Icons
import * as LR from 'lucide-react'
import { BimContext } from '../../../../../store/BIM/context'
import { ToolbarSubmenu } from '../../../../ToolbarSubmenu'
import { LengthMeasurement } from '../BimMeasurements/LenghtMeasurement'
import { Cursor } from '../Cursor'
interface MeasureToolProps {
  tool: Tool
}

type MeasureType = 'free' | 'edge' | 'area' | 'volume' 

export const MeasureBimTool: React.FC<MeasureToolProps> = ({ tool }) => {
  // Translation
  const t = useTranslations('MeasureBimTool')

  const { dispatch: toolsDispatch, state: toolsState } = React.useContext(ToolsContext)
  const { state: bimState } = React.useContext(BimContext)
  const [active, setActive] = React.useState(false)

  const { bimComponents } = bimState.bim
  const lengthMeasurement = bimComponents?.get(LengthMeasurement)
  const hoverHandler = bimComponents?.get(OBF.Hoverer)

      const setCursor = (cursor: CursorType) => {
        if (!bimComponents) return
        const currentCursor = bimComponents.get(Cursor)
        if (!currentCursor) return
        currentCursor.cursor = cursor
      }

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
    
    // Disable measurement when tool is deactivated
    if (currentToolId !== toolId && lengthMeasurement) {
      lengthMeasurement.enabled = false
      if (hoverHandler) {
        hoverHandler.enabled = true
      }
    }
  }, [currentToolId, toolId, lengthMeasurement])

  // Optional: Listen to measurement creation events
  React.useEffect(() => {
    if (!lengthMeasurement) return

    const handleMeasurementCreated = (data: { length: number }) => {
      console.log('Measurement created:', data.length)
      // You can add custom logic here when a measurement is created
    }

    lengthMeasurement.onDimensionCreate.add(handleMeasurementCreated)

    return () => {
      lengthMeasurement.onDimensionCreate.remove(handleMeasurementCreated)
    }
  }, [lengthMeasurement])

  const handleMeasureTypeChange = (type: MeasureType) => {
    if (!lengthMeasurement) return

    // Set the tool as active
    setTools(toolId)
    if (hoverHandler) {
      hoverHandler.enabled = false
    }

    // Enable the measurement component and set measurement mode
    if (type === 'free') {
      lengthMeasurement.createFreeMeasurements()
    }
    if (type === 'edge') {
      lengthMeasurement.createEdgeMeasurements()
    }

    setCursor('crosshair')
  }

  // Clear measurements function
  const clearMeasurements = () => {
    if (lengthMeasurement) {
      lengthMeasurement.deleteAll()
      lengthMeasurement.enabled = false
    }
    if (hoverHandler) {
      hoverHandler.enabled = true
    }
    setCursor('')
  }

  return (
    <ToolbarSubmenu tool={tool}>
      <DropdownMenuItem onClick={() => handleMeasureTypeChange('free')} >
        <LR.Ruler />
        <span>{t('free')}</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleMeasureTypeChange('edge')} >
        <LR.RulerDimensionLine />
        <span>{t('edge')}</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleMeasureTypeChange('area')} disabled={true}>
        <LR.SquareDashed />
        <span>{t('area')}</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleMeasureTypeChange('volume')} disabled={true}>
        <LR.Box />
        <span>{t('volume')}</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={clearMeasurements} >
        <LR.X />
        <span>{t('clear')}</span>
      </DropdownMenuItem>
    </ToolbarSubmenu>
  )
}
