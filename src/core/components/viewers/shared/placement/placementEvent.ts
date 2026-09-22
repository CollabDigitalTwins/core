// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** The slice of `OBC.Event` the placement core uses, so a non-OBC host can supply its own. */
export interface PlacementEvent<T> {
  add(listener: (data: T) => void): void
  remove(listener: (data: T) => void): void
  trigger(data: T): void
  reset(): void
}

export function createPlacementEvent<T>(): PlacementEvent<T> {
  const listeners = new Set<(data: T) => void>()
  return {
    add: listener => { listeners.add(listener) },
    remove: listener => { listeners.delete(listener) },
    trigger: (data) => { for (const listener of [...listeners]) listener(data) },
    reset: () => { listeners.clear() },
  }
}
