// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

import { Highlighter } from '../Highlighter'
import { VisibilityState } from '../VisibilityState'

import { isModelIdMapEmpty, modelIdMapSize, type ModelIdMap } from './bimTree'

/**
 * Select / hide / isolate, in one place.
 *
 * Both sidebar trees and the selection toolbar go through these, so the rules
 * live in a single module instead of being open-coded per panel. Two details
 * worth keeping in mind:
 *
 * - Selection routes through the viewer's **own** `Highlighter`, not
 *   `OBF.Highlighter`. `Components.get()` lazily *constructs* whatever class it
 *   is handed, so asking for the upstream highlighter silently yields an
 *   instance that was never `setup()`, whose `highlightByID` throws on an empty
 *   `events` map. Only the repo's highlighter fires `onElementsSelected`, which
 *   is what opens the properties menu.
 * - Visibility goes through `OBC.Hider`, which takes a `ModelIdMap` and so
 *   spans every loaded model. Reading it back with `getVisibilityMap` keeps the
 *   trees honest when something else (floorplan mode, another panel) changes
 *   visibility behind their back.
 */

/** Hovering a whole branch would build overlay geometry for every element in it. */
const MAX_HOVER_ITEMS = 200

function getHighlighter(components: OBC.Components): Highlighter | null {
  try {
    return components.get(Highlighter)
  } catch {
    return null
  }
}

function getHider(components: OBC.Components): OBC.Hider | null {
  try {
    return components.get(OBC.Hider)
  } catch {
    return null
  }
}

/** Lets every panel re-read visibility after any of the actions below change it. */
function notifyVisibilityChanged(components: OBC.Components): void {
  try {
    components.get(VisibilityState).notify()
  } catch {
    // No viewer to notify (teardown, or a headless test).
  }
}

/** Subscribe to visibility changes made anywhere through these actions. */
export function onVisibilityChanged(
  components: OBC.Components,
  listener: () => void,
): () => void {
  try {
    const state = components.get(VisibilityState)
    state.onChanged.add(listener)
    return () => state.onChanged.remove(listener)
  } catch {
    return () => {}
  }
}

/**
 * Subscribe to selection changes, however they were made — a click in the
 * viewport, a tree action, or a plugin calling `select()`.
 *
 * Fires for both selection and clearing, so a listener can just re-read
 * `getSelectedItems`. Mirrors {@link onVisibilityChanged}: one subscription point
 * so callers never reach into the Highlighter's events themselves.
 */
export function onSelectionChanged(
  components: OBC.Components,
  listener: () => void,
): () => void {
  const highlighter = getHighlighter(components)
  if (!highlighter) return () => {}

  highlighter.onElementsSelected.add(listener)
  highlighter.onSelectionCleared.add(listener)

  return () => {
    highlighter.onElementsSelected.remove(listener)
    highlighter.onSelectionCleared.remove(listener)
  }
}

export async function selectItems(
  components: OBC.Components,
  items: ModelIdMap,
): Promise<void> {
  if (isModelIdMapEmpty(items)) return
  await getHighlighter(components)?.highlightItems(items)
}

export async function hoverItems(
  components: OBC.Components,
  items: ModelIdMap,
): Promise<void> {
  const highlighter = getHighlighter(components)
  if (!highlighter) return
  if (isModelIdMapEmpty(items) || modelIdMapSize(items) > MAX_HOVER_ITEMS) {
    highlighter.clearHover()
    return
  }
  await highlighter.hoverItems(items)
}

export function clearHover(components: OBC.Components): void {
  getHighlighter(components)?.clearHover()
}

export function clearSelection(components: OBC.Components): void {
  getHighlighter(components)?.clearSelection()
}

/** The current selection keyed by model, or an empty map when nothing is selected. */
export function getSelectedItems(components: OBC.Components): ModelIdMap {
  return getHighlighter(components)?.selectedItems ?? {}
}

/** Reaching the Highlighter is this module's job; `lib/bimCamera` needs it too. */
export { getHighlighter }

export async function setItemsVisible(
  components: OBC.Components,
  items: ModelIdMap,
  visible: boolean,
): Promise<void> {
  if (isModelIdMapEmpty(items)) return
  await getHider(components)?.set(visible, items)
  notifyVisibilityChanged(components)
}

/** Hides everything except `items`, across every loaded model. */
export async function isolateItems(
  components: OBC.Components,
  items: ModelIdMap,
): Promise<void> {
  if (isModelIdMapEmpty(items)) return
  await getHider(components)?.isolate(items)
  notifyVisibilityChanged(components)
}

/** The escape hatch from isolate: makes every item in every model visible again. */
export async function showAllItems(components: OBC.Components): Promise<void> {
  await getHider(components)?.set(true)
  notifyVisibilityChanged(components)
}

/**
 * Everything currently hidden, keyed by model. The trees derive their checkbox
 * state from this rather than mirroring it locally, so the UI cannot drift from
 * the scene.
 */
export async function getHiddenItems(components: OBC.Components): Promise<ModelIdMap> {
  const hider = getHider(components)
  if (!hider) return {}
  try {
    const map = await hider.getVisibilityMap(false)
    const result: ModelIdMap = {}
    for (const modelId of Object.keys(map)) {
      result[modelId] = new Set(map[modelId])
    }
    return result
  } catch (error) {
    console.warn('Failed to read visibility state:', error)
    return {}
  }
}
