"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from "react";
import { toast } from 'sonner'

// Utilities
import { ToolsContext } from '../../../../../../store'
import { BimContext } from '../../../../../../store'

// Shadcn components
import { ToolbarSubmenu } from '../../../../../ToolbarSubmenu'
import { DropdownMenuItem } from '../../../../../ui/DropdownMenu'

// Icons
import { Cursor } from '../../Cursor'

import { ClippingPlanes } from './ClippingPlanes'

import type { CursorType } from '../../../../../../types/global'
import type { Tool, ToolbarToolType } from '../../../../../../types/tools'

/** Shared id so re-entering the mode replaces the instruction rather than stacking one. */
const TOAST_ID = 'bim-clipping-toast'

interface ClippingToolProps {
  tool: Tool
}

export const ClippingTool: React.FC<ClippingToolProps> = ({ tool }) => {
  const t = useTranslations('ClippingTool')

  const { dispatch: toolsDispatch, state: toolsState } = React.useContext(ToolsContext)
  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents, world } = bimState.bim
  const { currentToolId } = toolsState.tools

  const [active, setActive] = React.useState(false)

  const planes = React.useMemo(
    () => bimComponents?.get(ClippingPlanes) ?? null,
    [bimComponents],
  )

  const setCursor = React.useCallback((cursor: CursorType) => {
    if (!bimComponents) return
    const currentCursor = bimComponents.get(Cursor)
    if (!currentCursor) return
    currentCursor.cursor = cursor
  }, [bimComponents])

  const setTools = React.useCallback((currentToolId: ToolbarToolType) => {
    toolsDispatch({
      type: 'SET-TOOL',
      payload: { currentToolId },
    })
  }, [toolsDispatch])

  // The Clipper, the cut style and the drag listeners are wired once per world
  // instead of on every double-click. `setup` is idempotent and reads the world
  // itself; the dependency is here so a world arriving later still gets wired.
  React.useEffect(() => {
    if (!world) return
    planes?.setup()
  }, [planes, world])

  const startCreating = React.useCallback(() => {
    if (!planes) return
    setActive(true)
    setTools(tool.id)
    setCursor('crosshair')
    planes.setSquaresVisible(true)
    toast.info(t('hint'), { id: TOAST_ID, duration: Infinity })
  }, [planes, setTools, setCursor, t, tool.id])

  /**
   * Single exit path, so cancelling from the menu, finishing with Enter, clearing
   * with Escape and another tool taking over all leave the same state behind.
   * The squares go, the arrow gizmos stay: an existing section is still draggable.
   *
   * `releaseTool` is false only when another tool has already claimed the
   * toolbar — clearing it there would deselect the tool the user just picked.
   */
  const stopCreating = React.useCallback((deleteAll: boolean, releaseTool: boolean) => {
    setActive(false)
    setCursor('')
    toast.dismiss(TOAST_ID)
    planes?.setSquaresVisible(false)
    if (deleteAll) planes?.deleteAll()
    if (releaseTool) setTools(null)
  }, [planes, setCursor, setTools])

  // An Infinity toast has no other way out if the viewer unmounts mid-mode.
  React.useEffect(() => () => {
    toast.dismiss(TOAST_ID)
  }, [])

  // Another tool taking over has to stop plane creation. Without this, `active`
  // stays true after a tool switch and the dblclick listener below survives, so
  // a double-click meant for (say) a measurement also drops a clipping plane.
  React.useEffect(() => {
    if (currentToolId === tool.id || !active) return
    stopCreating(false, false)
  }, [currentToolId, tool.id, active, stopCreating])

  // Enter finishes and keeps the planes, Escape clears them, Backspace/Delete
  // removes the one under the cursor.
  React.useEffect(() => {
    if (!active || !planes) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Something nearer the keystroke already dealt with it — an open menu
      // closing on Escape, for instance, which must not also clear the planes.
      if (event.defaultPrevented) return

      if (event.key === 'Enter') {
        stopCreating(false, true)
        return
      }
      if (event.key === 'Escape') {
        stopCreating(true, true)
        return
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        planes.deleteAtCursor()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [active, planes, stopCreating])

  React.useEffect(() => {
    if (!active || !planes) return

    const container = world?.renderer?.three.domElement
    if (!container) return

    const onDoubleClick = () => {
      void planes.createAtCursor()
    }
    container.addEventListener('dblclick', onDoubleClick)

    return () => {
      container.removeEventListener('dblclick', onDoubleClick)
    }
  }, [active, planes, world])

  return (
    <div>
      <ToolbarSubmenu tool={tool}>
        <DropdownMenuItem
          onClick={() => (active ? stopCreating(false, true) : startCreating())}
        >
          <LR.PlusSquare />
          <span>{active ? t('cancelAdd') : t('add')}</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => planes?.deleteAll()}>
          <LR.Trash2 />
          <span>{t('deleteAll')}</span>
        </DropdownMenuItem>
      </ToolbarSubmenu>
    </div>
  )
}
