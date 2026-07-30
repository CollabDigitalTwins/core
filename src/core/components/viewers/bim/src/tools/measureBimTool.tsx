"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from "react";

import { ToolsContext } from '../../../../../store'
import { BimContext } from '../../../../../store/BIM/context'
import { type ToolbarToolType } from '../../../../../types/tools'
import { ToolbarSubmenu } from '../../../../ToolbarSubmenu'
import { Card } from '../../../../ui/Card'
import {
  DropdownMenuItem,
} from '../../../../ui/DropdownMenu'
import { BimMeasurementManager } from '../BimMeasurements/BimMeasurementManager'
import { Cursor } from '../Cursor'

import type { CursorType } from '../../../../../types/global'
import type { Tool } from '../../../../../types/tools';
import type { BimMeasureKind, BimMeasureMode } from '../BimMeasurements/measurementSettings'

interface MeasureToolProps {
  tool: Tool
}

/** One submenu entry: the kind/mode pair it activates and how to label it. */
interface MeasureOption {
  id: string
  kind: BimMeasureKind
  mode: BimMeasureMode
  labelKey: 'free' | 'edge' | 'area' | 'volume' | 'angle'
  hintKey: 'hintLength' | 'hintArea' | 'hintVolume' | 'hintAngle'
  icon: React.ComponentType<{ className?: string }>
}

const MEASURE_OPTIONS: MeasureOption[] = [
  { id: 'free', kind: 'length', mode: 'free', labelKey: 'free', hintKey: 'hintLength', icon: LR.Ruler },
  { id: 'edge', kind: 'length', mode: 'edge', labelKey: 'edge', hintKey: 'hintLength', icon: LR.RulerDimensionLine },
  { id: 'area', kind: 'area', mode: 'free', labelKey: 'area', hintKey: 'hintArea', icon: LR.SquareDashed },
  { id: 'volume', kind: 'volume', mode: 'free', labelKey: 'volume', hintKey: 'hintVolume', icon: LR.Box },
  { id: 'angle', kind: 'angle', mode: 'free', labelKey: 'angle', hintKey: 'hintAngle', icon: LR.Triangle },
]

export const MeasureBimTool: React.FC<MeasureToolProps> = ({ tool }) => {
  // Translation
  const t = useTranslations('MeasureBimTool')

  const { dispatch: toolsDispatch, state: toolsState } = React.useContext(ToolsContext)
  const { state: bimState } = React.useContext(BimContext)

  /** Which submenu entry is live, so the hint card can describe it. */
  const [activeOptionId, setActiveOptionId] = React.useState<string | null>(null)

  const { bimComponents } = bimState.bim
  const measurements = bimComponents?.get(BimMeasurementManager)

  const toolId = tool.id
  const { currentToolId } = toolsState.tools
  const isActive = currentToolId === toolId

  const setCursor = React.useCallback((cursor: CursorType) => {
    if (!bimComponents) return
    const currentCursor = bimComponents.get(Cursor)
    if (!currentCursor) return
    currentCursor.cursor = cursor
  }, [bimComponents])

  const setTools = (currentToolId: ToolbarToolType) => {
    toolsDispatch({
      type: 'SET-TOOL',
      payload: { currentToolId },
    })
  }

  // Stop measuring when another tool takes over. The manager propagates this to
  // the underlying OBF measurers and detaches their listeners, so a later
  // double-click can no longer create a stray measurement.
  //
  // The `activeKind` check is not just an optimisation: this effect also runs on
  // mount, when no measurement has ever been activated and so no measurer has a
  // world yet. Tearing down in that state is meaningless work.
  React.useEffect(() => {
    if (isActive || !measurements?.activeKind) return
    measurements.deactivate()
    setActiveOptionId(null)
    setCursor('')
  }, [isActive, measurements, setCursor])

  // Escape leaves measurement mode entirely. The library already cancels the
  // in-progress shape on Escape; this deselects the tool on top of that.
  React.useEffect(() => {
    if (!isActive) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setTools(null)
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
    // setTools closes over toolsDispatch, which React guarantees is stable.
  }, [isActive])

  const handleMeasureTypeChange = (option: MeasureOption) => {
    if (!measurements) return

    // activate() returns false when there is no world or renderer yet. Leaving
    // the tool inactive in that case is better than showing a live crosshair
    // that silently does nothing.
    if (!measurements.activate(option.kind, option.mode)) return

    setTools(toolId)
    setActiveOptionId(option.id)
    setCursor('crosshair')
  }

  const clearMeasurements = () => {
    if (!measurements) return
    measurements.clearAll()
    measurements.deactivate()
    setActiveOptionId(null)
    setTools(null)
    setCursor('')
  }

  const activeOption = MEASURE_OPTIONS.find(option => option.id === activeOptionId)

  return (
    <div>
      <ToolbarSubmenu tool={tool}>
        {MEASURE_OPTIONS.map(option => {
          const Icon = option.icon
          return (
            <DropdownMenuItem key={option.id} onClick={() => handleMeasureTypeChange(option)}>
              <Icon />
              <span>{t(option.labelKey)}</span>
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuItem onClick={clearMeasurements}>
          <LR.X />
          <span>{t('clear')}</span>
        </DropdownMenuItem>
      </ToolbarSubmenu>

      {isActive && activeOption && (
        <Card className="p-3 absolute bottom-10 left-0 bg-background shadow-md z-10 w-full">
          <span className="text-muted-foreground text-xs">
            {t(activeOption.hintKey)}
          </span>
        </Card>
      )}
    </div>
  )
}
