// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** Platform highlight colour, shared by map + BIM comment/sensor markers. */
export const HIGHLIGHT_COLOR = '#73cee2'

// Tailwind class string for marker highlight style
export const markerStyle  =
  'absolute z-[99999] pointer-events-auto rounded-[16px] transition-[box-shadow] ' +
  'translate-x-[-50%] translate-y-[-90%]';

// Tailwind class string for marker style
export const markerStyleHighlight =
  'absolute z-[99999] pointer-events-auto rounded-[16px] transition-[box-shadow] ' +
  'shadow-[0_0_0_2px_#73cee2,0_0_16px_4px_rgba(115,206,226,0.5)] ' +
  'translate-x-[-50%] translate-y-[-90%]';

/**
 * `box-shadow` ring for a comment marker, shared by every surface so the ring widths stay
 * consistent: 1px white (idle), 2px highlight (hover/selected), 3px focus (double-click zoom).
 */
export function commentRingShadow({ highlight, focused }: { highlight?: boolean; focused?: boolean }): string {
  if (focused) return `0 0 0 3px ${HIGHLIGHT_COLOR}, 0 0 12px rgba(115, 206, 226, 0.6)`
  if (highlight) return `0 0 0 2px ${HIGHLIGHT_COLOR}, 0 0 8px rgba(115, 206, 226, 0.5)`
  return '0 0 0 1px white'
}

