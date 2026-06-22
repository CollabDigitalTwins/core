// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Per-IFC-class drawing-layer configuration.
 *
 * The drawing splits its visible lines into one layer per IFC class so the
 * sidebar can toggle visibility / change color per class, and so a future
 * DXF export can map each class to a distinct DXF layer.
 *
 * Cut classes (walls, columns, curtain-wall mullions / panels) render dark
 * gray; fill classes (slabs, roofs) render pure black; everything else is
 * mid-gray. We don't rely on `linewidth > 1` because `LineBasicMaterial`
 * ignores it on most WebGL contexts.
 */

/** Classes the section plane traverses in plan view. */
export const CUT_CLASSES = new Set<string>([
  'IFCWALL',
  'IFCWALLSTANDARDCASE',
  'IFCCURTAINWALL',
  'IFCPLATE',
  'IFCMEMBER',
  'IFCCOLUMN',
  'IFCCOLUMNSTANDARDCASE',
])

/** Horizontal closures (slabs/roofs). */
export const FILL_CLASSES = new Set<string>([
  'IFCSLAB',
  'IFCROOF',
  'IFCCOVERING',
])

/** Light classes — furniture / fixtures / soft fittings. Rendered in a
 *  pale gray so the structural lines pop. WebGL can't actually vary line
 *  width with `LineBasicMaterial`, so we approximate the line-weight
 *  hierarchy of a real CAD plot via color contrast. */
export const LIGHT_CLASSES = new Set<string>([
  'IFCFURNISHINGELEMENT',
  'IFCFURNITURE',
  'IFCSYSTEMFURNITUREELEMENT',
  'IFCFLOWTERMINAL',
  'IFCSANITARYTERMINAL',
  'IFCLIGHTFIXTURE',
  'IFCELECTRICAPPLIANCE',
  'IFCAIRTERMINAL',
  'IFCRAILING',
])

/** Projection / layer order: structural elements first so they appear
 *  quickly when projection is progressive. Classes not in this list run
 *  after, in the order returned by `getItemsOfCategories`. */
export const CLASS_PROJECTION_PRIORITY: readonly string[] = [
  'IFCWALL',
  'IFCWALLSTANDARDCASE',
  'IFCCOLUMN',
  'IFCCOLUMNSTANDARDCASE',
  'IFCSLAB',
  'IFCROOF',
  'IFCCURTAINWALL',
  'IFCPLATE',
  'IFCMEMBER',
  'IFCCOVERING',
]

export interface DrawingLayerInfo {
  /** Raw IFC category name (e.g. "IFCWALL"). Also the drawing layer key. */
  className: string
  /** Layer name as registered in the TechnicalDrawing — equal to className. */
  layerName: string
  /** Currently visible. */
  visible: boolean
  /** Hex color of the line material. */
  color: number
  /** How many model items contribute to this layer. */
  itemCount: number
  /** Optional i18n key (next-intl namespace.path) for the UI label. The
   *  sidebar should prefer `t(displayKey)` over `className` when set. Used
   *  for non-IFC layers like "Door Swings" that need a localized label. */
  displayKey?: string
}

/** Default line color for a given IFC class. The contrast steps simulate
 *  a CAD line-weight hierarchy (true variable widths would need Line2 +
 *  resolution tracking — a real upgrade rather than a low-effort tweak):
 *   - Fill (slabs, roofs)            → pure black, heaviest read
 *   - Cut (walls, columns, mullions) → dark gray, clearly structural
 *   - Light (furniture, fixtures)    → pale gray, recedes visually
 *   - Everything else                → mid gray */
export function defaultLayerColor(className: string): number {
  if (FILL_CLASSES.has(className)) return 0x000000
  if (CUT_CLASSES.has(className)) return 0x333333
  if (LIGHT_CLASSES.has(className)) return 0xb0b0b0
  return 0x666666
}

/**
 * Return the entries of `itemIdsByClass` sorted by projection priority:
 * priority-listed classes first (in their declared order), then everything
 * else in its original insertion order.
 */
export function sortClassesByPriority(
  itemIdsByClass: Map<string, number[]>,
): Map<string, number[]> {
  const sorted = new Map<string, number[]>()
  for (const className of CLASS_PROJECTION_PRIORITY) {
    const ids = itemIdsByClass.get(className)
    if (ids && ids.length > 0) sorted.set(className, ids)
  }
  for (const [className, ids] of itemIdsByClass) {
    if (!sorted.has(className) && ids.length > 0) sorted.set(className, ids)
  }
  return sorted
}
