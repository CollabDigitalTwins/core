// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** Movement past this reads as a camera pan rather than a click, in CSS pixels. */
export const DRAG_SLOP_PX = 5

export const RIGHT_BUTTON = 2

export interface RightPress {
  x: number
  y: number
  moved: boolean
}

/**
 * The right button pans the camera as well as opening the menu, so a press counts as a click only
 * while it has not moved. Duration is ignored: a pan always moves, and a slow click must still open.
 */
export function beginPress(x: number, y: number): RightPress {
  return { x, y, moved: false }
}

export function trackPress(press: RightPress, x: number, y: number): RightPress {
  if (press.moved) return press
  if (Math.hypot(x - press.x, y - press.y) <= DRAG_SLOP_PX) return press
  return { ...press, moved: true }
}

export function opensMenu(press: RightPress | null): boolean {
  return press !== null && !press.moved
}

export interface ViewportRect {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * The viewport owns the right button outright, so the native menu is unwanted anywhere inside it.
 * Testing the point rather than the event target catches the marker overlays too.
 */
export function withinViewport(rect: ViewportRect, x: number, y: number): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}
