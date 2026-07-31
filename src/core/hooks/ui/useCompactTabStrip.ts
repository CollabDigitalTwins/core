// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

/**
 * Width (px) a tab needs before its text label is worth rendering. Below this the
 * label truncates to unreadable stubs ("Se..." for both Sensors and Settings), so
 * the strip drops to icon-only instead.
 */
export const MIN_TAB_LABEL_WIDTH = 64

/**
 * Whether a strip of `itemCount` items in `width` px is too tight for text labels.
 * Non-positive or non-finite widths (unmeasured, detached, display:none) count as
 * compact — icon-only is never visually broken, a truncated label is.
 */
export function isCompactWidth(
  width: number,
  itemCount: number,
  minItemWidth: number = MIN_TAB_LABEL_WIDTH,
): boolean {
  if (!Number.isFinite(width) || width <= 0) return true
  if (itemCount <= 0) return true
  return width / itemCount < minItemWidth
}

/**
 * Tracks whether a tab strip has room for text labels.
 *
 * Measures the element rather than the viewport because the viewer sidebar's width
 * is user-resizable and persisted (see `useResizableSidebarWidth`) — a media query
 * cannot see a sidebar the user dragged narrow on a wide screen.
 *
 * Starts compact so the first paint is icon-only and never flashes truncated text;
 * labels appear on the first measurement if they fit.
 */
export function useCompactTabStrip(
  ref: React.RefObject<HTMLElement | null>,
  itemCount: number,
  minItemWidth: number = MIN_TAB_LABEL_WIDTH,
): boolean {
  const [compact, setCompact] = React.useState(true)

  React.useEffect(() => {
    const element = ref.current
    if (!element) return

    const measure = (width: number) => {
      setCompact(isCompactWidth(width, itemCount, minItemWidth))
    }

    measure(element.getBoundingClientRect().width)

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      // contentRect excludes padding, which is what the tabs actually share.
      measure(entry.contentRect.width)
    })
    observer.observe(element)

    return () => observer.disconnect()
  }, [ref, itemCount, minItemWidth])

  return compact
}
