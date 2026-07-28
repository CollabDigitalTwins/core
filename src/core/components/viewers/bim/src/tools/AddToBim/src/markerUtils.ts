// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Layout-only classes for a CSS2D marker card. The ring/glow is NOT here: it is an inline
 * `box-shadow` from `sensorRingShadow`, because a sensor's ring colour is its current value and
 * Tailwind cannot express a runtime colour.
 */
export const markerStyle =
  'absolute z-[99999] pointer-events-auto rounded-[16px] transition-[box-shadow] ' +
  'translate-x-[-50%] translate-y-[-90%]';
