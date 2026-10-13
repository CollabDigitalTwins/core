// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { hasMapApi } from '../../../../utils/hasMapApi'

import type { MapClickManager } from '../../../../utils/MapEventManager/MapClickManager'
import type * as maplibregl from 'maplibre-gl'

/** While active, pauses the map's click popups, holds the cursor, and sends map clicks and key presses to the tool. */
export function useMapToolSession({ map, mapClickManager, active, cursor, onClick, onKeyDown }: {
  map: maplibregl.Map | null | undefined
  mapClickManager?: MapClickManager | null
  active: boolean
  cursor: string
  onClick: (e: maplibregl.MapMouseEvent) => void
  onKeyDown: (e: KeyboardEvent) => void
}) {
  const handlers = React.useRef({ onClick, onKeyDown })
  handlers.current = { onClick, onKeyDown }

  React.useEffect(() => {
    if (!active || !hasMapApi(map)) return

    const canvas = map.getCanvas()
    const holdCursor = () => { if (canvas.style.cursor !== cursor) canvas.style.cursor = cursor }
    const click = (e: maplibregl.MapMouseEvent) => handlers.current.onClick(e)
    const keyDown = (e: KeyboardEvent) => handlers.current.onKeyDown(e)

    mapClickManager?.setSuspended(true)
    holdCursor()
    map.on('click', click)
    map.on('mousemove', holdCursor)
    window.addEventListener('keydown', keyDown)
    return () => {
      mapClickManager?.setSuspended(false)
      canvas.style.cursor = ''
      map.off('click', click)
      map.off('mousemove', holdCursor)
      window.removeEventListener('keydown', keyDown)
    }
  }, [active, map, mapClickManager, cursor])
}
