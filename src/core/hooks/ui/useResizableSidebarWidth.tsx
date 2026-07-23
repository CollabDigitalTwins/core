'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useIsMobile } from './use-mobile'

/** Minimum sidebar width. Equal to the previous fixed width, so it never shrinks below the old default. */
export const MIN_SIDEBAR_WIDTH = 410
/** Maximum sidebar width, roughly half a laptop viewport. */
export const MAX_SIDEBAR_WIDTH = 720
export const DEFAULT_SIDEBAR_WIDTH = MIN_SIDEBAR_WIDTH
export const SIDEBAR_WIDTH_STORAGE_KEY = 'cdt:sidebar-width'

/** Clamp to [MIN, MAX]. NaN falls back to the default; ±Infinity clamps to the bounds. */
export function clampSidebarWidth(width: number): number {
  if (Number.isNaN(width)) return DEFAULT_SIDEBAR_WIDTH
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width))
}

/** SSR-safe read of the persisted width, clamped; falls back to the default on missing/corrupt values. */
export function readStoredSidebarWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH
  try {
    const raw = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY)
    if (raw === null) return DEFAULT_SIDEBAR_WIDTH
    const parsed = Number.parseFloat(raw)
    if (!Number.isFinite(parsed)) return DEFAULT_SIDEBAR_WIDTH
    return clampSidebarWidth(parsed)
  } catch {
    return DEFAULT_SIDEBAR_WIDTH
  }
}

/** SSR-safe persist of a clamped width. Swallows storage errors (private mode, quota). */
export function writeStoredSidebarWidth(width: number): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(clampSidebarWidth(width)))
  } catch {
    // ignore: storage may be unavailable (private mode / quota)
  }
}

export interface ResizableSidebarWidth {
  /** Current width in px. Only meaningful when `canResize` is true; mobile stays full-width via CSS. */
  width: number
  /** True while a drag is in progress (for cursor / no-select styling). */
  isResizing: boolean
  /** True on desktop only. Mobile is full-width and not resizable. */
  canResize: boolean
  /** Attach to the drag handle's onPointerDown. */
  startResize: (e: React.PointerEvent) => void
}

/**
 * Drives a user-resizable sidebar width on desktop. Width is restored from and persisted to
 * localStorage, clamped to [MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH]. On mobile (`useIsMobile`)
 * resizing is disabled and the sidebar is expected to render full-width via CSS.
 */
export function useResizableSidebarWidth(): ResizableSidebarWidth {
  const isMobile = useIsMobile()
  const canResize = !isMobile

  const [width, setWidth] = React.useState<number>(DEFAULT_SIDEBAR_WIDTH)
  const [isResizing, setIsResizing] = React.useState(false)

  // Hydrate from storage after mount (avoids SSR/client mismatch on first paint).
  React.useEffect(() => {
    setWidth(readStoredSidebarWidth())
  }, [])

  const startResize = React.useCallback(
    (e: React.PointerEvent) => {
      if (!canResize) return
      e.preventDefault()
      setIsResizing(true)

      const startX = e.clientX
      const startWidth = width

      const onMove = (ev: PointerEvent) => {
        setWidth(clampSidebarWidth(startWidth + (ev.clientX - startX)))
      }
      const onUp = () => {
        setIsResizing(false)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        // Persist the final width; read the latest via the functional updater.
        setWidth(current => {
          writeStoredSidebarWidth(current)
          return current
        })
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [canResize, width]
  )

  return { width, isResizing, canResize, startResize }
}
