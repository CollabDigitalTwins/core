// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

import { type ModelIdMap } from './bimTree'

/**
 * Read-only queries across every loaded model.
 *
 * The per-model Fragments API (`model.getItemsOfCategories`, `model.getItemsData`)
 * is already used directly by the floorplan and drawing code, which needs one
 * model at a time. These wrappers cover the other case: "give me this across the
 * whole scene, keyed by model", which is the shape `ModelIdMap` consumers — and
 * the plugin SDK — work in.
 */

/** RegExp-escape, so a category name is matched literally. */
function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

/**
 * Every element of one IFC class, across all loaded models.
 *
 * Matched case-insensitively against the whole name, so `'IfcSpace'` and
 * `'IFCSPACE'` both work and neither matches `IFCSPACEHEATER`.
 *
 * Note for callers wanting spaces: `IFCSPACE` is in
 * {@link DEFAULT_HIDDEN_IFC_CLASSES}, so its elements exist but start hidden.
 * Showing them is a separate `setItemsVisible` call.
 */
export async function getItemsOfCategory(
  components: OBC.Components,
  category: string,
): Promise<ModelIdMap> {
  const result: ModelIdMap = {}
  if (!category) return result

  const pattern = new RegExp(`^${escapeRegExp(category)}$`, 'i')

  let fragments: OBC.FragmentsManager
  try {
    fragments = components.get(OBC.FragmentsManager)
  } catch {
    return result
  }

  for (const [modelId, model] of fragments.list) {
    try {
      const byCategory = (await model.getItemsOfCategories([pattern])) as Record<string, number[]>
      const localIds = Object.values(byCategory).flat()
      if (localIds.length > 0) result[modelId] = new Set(localIds)
    } catch (error) {
      // One unreadable model must not fail the whole query.
      console.warn(`Failed to read category "${category}" from model "${modelId}":`, error)
    }
  }

  return result
}

export interface BimItemProperties extends Record<string, unknown> {
  modelId: string
  localId: number
}

/**
 * Attributes for the given elements, one entry per element.
 *
 * Pass `attributes` to limit what is read (`['Name', 'LongName']`); omit it for
 * the model's default attribute set. `modelId` and `localId` are always included
 * so a caller can map a result back to the element it came from.
 */
export async function getItemProperties(
  components: OBC.Components,
  items: ModelIdMap,
  attributes?: string[],
): Promise<BimItemProperties[]> {
  const result: BimItemProperties[] = []

  let fragments: OBC.FragmentsManager
  try {
    fragments = components.get(OBC.FragmentsManager)
  } catch {
    return result
  }

  for (const [modelId, localIdSet] of Object.entries(items)) {
    const model = fragments.list.get(modelId)
    const localIds = [...localIdSet]
    if (!model || localIds.length === 0) continue

    try {
      // Returns one entry per requested id, in order.
      const data = await model.getItemsData(localIds, {
        attributesDefault: !attributes,
        attributes,
      })

      for (const [index, entry] of data.entries()) {
        result.push({ modelId, localId: localIds[index], ...(entry as Record<string, unknown>) })
      }
    } catch (error) {
      console.warn(`Failed to read properties from model "${modelId}":`, error)
    }
  }

  return result
}
