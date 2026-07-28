// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { withAlpha } from './colourUtils'

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

/**
 * `box-shadow` ring for a sensor marker.
 *
 * When `haloColour` is given, the ring carries the sensor's current *value* (see
 * `sensorColour.ts`), so it can no longer also carry selection. Focus therefore moves to ring
 * **width**: 2px at rest, 3px hovered, 4px focused, all in the value colour. Without a value
 * colour it degrades to the platform comment tiers so an unconfigured sensor type looks exactly
 * as it did before the value ramp existed.
 */
export function sensorRingShadow(
  { haloColour, highlight, focused }: { haloColour?: string; highlight?: boolean; focused?: boolean },
): string {
  if (!haloColour) return commentRingShadow({ highlight, focused })
  const width = focused ? 4 : highlight ? 3 : 2
  const spread = focused ? 18 : highlight ? 14 : 10
  return `0 0 0 ${width}px ${haloColour}, 0 0 ${spread}px ${withAlpha(haloColour, 0.55)}`
}

