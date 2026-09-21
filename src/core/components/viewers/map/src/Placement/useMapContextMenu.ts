'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import type * as maplibregl from 'maplibre-gl'

/** Anything that moves the map under a menu, or is a click meant for the map rather than the card. */
export const DISMISSING_MAP_EVENTS = ['dragstart', 'rotatestart', 'pitchstart', 'zoomstart', 'click'] as const

/** A right-press opens the menu and nudges maplibre's rotate, which would close it on the spot. */
export const SETTLE_MS = 300

export interface MapContextMenu<T> {
  x: number
  y: number
  item: T
}

export interface MapContextMenuSession<T> {
  menu: MapContextMenu<T> | null
  open: (menu: MapContextMenu<T>) => void
  close: () => void
}

const closers = new Set<() => void>()

/** One open menu across every layer: the map's own menus never stack, and the map dismisses them. */
export function useMapContextMenu<T>(map: maplibregl.Map | null | undefined): MapContextMenuSession<T> {
  const [menu, setMenu] = React.useState<MapContextMenu<T> | null>(null)
  const openedAt = React.useRef(0)

  const close = React.useCallback(() => setMenu(null), [])

  const closeIfSettled = React.useCallback(() => {
    if (Date.now() - openedAt.current >= SETTLE_MS) setMenu(null)
  }, [])

  React.useEffect(() => {
    closers.add(close)
    return () => { closers.delete(close) }
  }, [close])

  React.useEffect(() => {
    if (!map) return
    for (const event of DISMISSING_MAP_EVENTS) map.on(event, closeIfSettled)
    return () => { for (const event of DISMISSING_MAP_EVENTS) map.off(event, closeIfSettled) }
  }, [map, closeIfSettled])

  const open = React.useCallback((next: MapContextMenu<T>) => {
    for (const other of closers) if (other !== close) other()
    openedAt.current = Date.now()
    setMenu(next)
  }, [close])

  return { menu, open, close }
}
