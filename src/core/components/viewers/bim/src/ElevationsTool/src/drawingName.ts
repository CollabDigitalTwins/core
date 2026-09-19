// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { ElevationEntry } from './types'

/** Name the DXF viewport carries, so a renamed entry exports under the new name. */
export function drawingNameFor(entry: ElevationEntry): string {
  return `Elevation - ${entry.label ?? entry.direction}`
}
