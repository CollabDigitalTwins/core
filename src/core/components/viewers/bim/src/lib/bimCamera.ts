// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { FitCamera } from '../FitCamera'

import { getHighlighter } from './bimItemActions'

import type * as OBC from '@thatopen/components'

/**
 * Camera framing, kept out of `lib/bimItemActions`.
 *
 * `FitCamera` reaches `CurrentWorld`, which extends `OBC.Component` at module
 * evaluation time — so importing it drags the world/camera graph in. The item
 * actions are used in contexts that have neither (unit tests included), and their
 * module graph is deliberately narrow.
 */

/**
 * Frame the camera on the current selection. No-op when nothing is selected.
 *
 * Reuses the overlay meshes the Highlighter has already built for the selection,
 * so this needs no geometry work of its own.
 */
export async function fitToSelection(components: OBC.Components): Promise<void> {
  const meshes = [...(getHighlighter(components)?.selectedMeshes ?? [])]
  if (meshes.length === 0) return

  try {
    await components.get(FitCamera).fitToSelection(meshes)
  } catch (error) {
    // No world yet, or the camera is mid-teardown.
    console.warn('Failed to frame the selection:', error)
  }
}
