// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

type Listener = (file: File) => void

const listeners = new Set<Listener>()

/**
 * Hands a file the sidebar picked to the one `useFilePlacement` the toolbar owns. A second
 * instance would bind its own `dblclick` and place the file twice.
 */
export function requestPlacement(file: File): boolean {
  if (listeners.size === 0) return false
  for (const listener of listeners) listener(file)
  return true
}

export function subscribeToPlacementRequests(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
