// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { PluginCapability } from '../sdk/types'

export interface RegistryEntry {
  pluginId: string
  id?: string
  [key: string]: unknown
}

/** Shared identity for "nothing registered here", so getAll() is snapshot-stable. */
const EMPTY: readonly RegistryEntry[] = Object.freeze([])

export class PluginRegistry {
  private entries: Map<string, RegistryEntry[]> = new Map()
  private listeners: Set<() => void> = new Set()
  private version = 0

  /**
   * Contributions are stored copy-on-write: a mutation replaces the array for
   * that extension point instead of pushing into it. Consumers read the registry
   * through `useSyncExternalStore` (see host/provider.tsx), which bails out of a
   * re-render when the snapshot is `Object.is`-equal to the previous one — an
   * in-place push would notify and then be discarded as "unchanged". Copying also
   * keeps every *untouched* extension point at its old identity, so registering a
   * map tool does not re-render the BIM toolbar.
   */
  register(extensionPoint: PluginCapability | string, entry: RegistryEntry): void {
    const list = this.entries.get(extensionPoint) ?? []

    // Prevent duplicate: same pluginId + same id
    if (entry.id) {
      const exists = list.some(e => e.pluginId === entry.pluginId && e.id === entry.id)
      if (exists) return
    }

    this.entries.set(extensionPoint, [...list, entry])
    this.bump()
  }

  getAll<T extends RegistryEntry = RegistryEntry>(extensionPoint: string): T[] {
    return (this.entries.get(extensionPoint) ?? EMPTY) as T[]
  }

  deregisterAll(pluginId: string): void {
    let changed = false

    for (const [point, entries] of this.entries) {
      const remaining = entries.filter(e => e.pluginId !== pluginId)
      if (remaining.length !== entries.length) {
        this.entries.set(point, remaining)
        changed = true
      }
    }

    if (changed) this.bump()
  }

  clear(): void {
    if (this.entries.size === 0) return
    this.entries.clear()
    this.bump()
  }

  /** Subscribe to contribution changes. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Monotonic counter, bumped on every actual change. Useful in tests and debug UI. */
  getVersion(): number {
    return this.version
  }

  private bump(): void {
    this.version++
    for (const listener of this.listeners) listener()
  }
}
