// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { hasMapApi } from '../../../../utils/hasMapApi'

import type { MapClickManager } from '../../../../utils/MapEventManager/MapClickManager'
import type * as maplibregl from 'maplibre-gl'

type MouseHandler = (e: maplibregl.MapMouseEvent) => void

/** While active, pauses the map's click popups, holds the cursor, and sends map clicks, pointer moves and key presses to the tool. */
export function useMapToolSession({ map, mapClickManager, active, cursor, onClick, onKeyDown, onMouseDown, onMouseMove, onMouseUp }: {
  map: maplibregl.Map | null | undefined
  mapClickManager?: MapClickManager | null
  active: boolean
  cursor: string
  onClick: MouseHandler
  onKeyDown: (e: KeyboardEvent) => void
  onMouseDown?: MouseHandler
  onMouseMove?: MouseHandler
  onMouseUp?: MouseHandler
}) {
  const handlers = React.useRef({ cursor, onClick, onKeyDown, onMouseDown, onMouseMove, onMouseUp })
  handlers.current = { cursor, onClick, onKeyDown, onMouseDown, onMouseMove, onMouseUp }

  React.useEffect(() => {
    if (!active || !hasMapApi(map)) return
    map.getCanvas().style.cursor = cursor
  }, [active, map, cursor])

  React.useEffect(() => {
    if (!active || !hasMapApi(map)) return

    const canvas = map.getCanvas()
    const holdCursor = () => {
      if (canvas.style.cursor !== handlers.current.cursor) canvas.style.cursor = handlers.current.cursor
    }
    const click = (e: maplibregl.MapMouseEvent) => handlers.current.onClick(e)
    const keyDown = (e: KeyboardEvent) => handlers.current.onKeyDown(e)
    const mouseDown = (e: maplibregl.MapMouseEvent) => handlers.current.onMouseDown?.(e)
    const mouseMove = (e: maplibregl.MapMouseEvent) => {
      handlers.current.onMouseMove?.(e)
      holdCursor()
    }
    const mouseUp = (e: maplibregl.MapMouseEvent) => handlers.current.onMouseUp?.(e)

    mapClickManager?.setSuspended(true)
    holdCursor()
    map.on('click', click)
    map.on('mousedown', mouseDown)
    map.on('mousemove', mouseMove)
    map.on('mouseup', mouseUp)
    window.addEventListener('keydown', keyDown)
    return () => {
      mapClickManager?.setSuspended(false)
      canvas.style.cursor = ''
      map.off('click', click)
      map.off('mousedown', mouseDown)
      map.off('mousemove', mouseMove)
      map.off('mouseup', mouseUp)
      window.removeEventListener('keydown', keyDown)
    }
  }, [active, map, mapClickManager])
}
