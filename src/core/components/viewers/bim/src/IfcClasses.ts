// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

import { isModelIdMapEmpty, modelIdMapSize, type BimTreeNode } from './lib/bimTree'

/** Classification name used in `OBC.Classifier.list`. */
export const IFC_CLASS_CLASSIFICATION = 'Categories'

/** Models load in a loop, so coalesce the resulting bursts into one rebuild. */
const REBUILD_DEBOUNCE_MS = 150

/**
 * Groups every loaded model's elements by IFC class (IFCWALL, IFCSLAB, …) for
 * the sidebar, on top of `OBC.Classifier`.
 *
 * `Classifier.byCategory()` registers one *query-backed* group per category
 * found via `ItemsFinder.addFromCategories()`, which means:
 *
 * - Groups resolve live, so a model loaded later is picked up by the existing
 *   queries without re-classifying anything.
 * - Only categories that actually have geometry are listed, so the panel does
 *   not fill up with property sets and other non-visual entities.
 *
 * Class names are deliberately left as they come out of the IFC — `IFCWALL`,
 * not "Wall" — so they match what users see in other IFC tooling.
 */
export class IfcClasses extends OBC.Component implements OBC.Disposable {
  static readonly uuid = '3b6f1c94-58ad-4d7e-9a02-7c1e5f2b8d41' as const

  enabled = true

  readonly onClassesChanged = new OBC.Event<{ classes: BimTreeNode[] }>()
  readonly onLoadingStateChanged = new OBC.Event<{ isLoading: boolean }>()
  /**
   * Required for `dispose()` to run at all: OBC's `isDisposeable()` is
   * `'dispose' in this && 'onDisposed' in this`.
   */
  readonly onDisposed = new OBC.Event<string>()

  private _classes: BimTreeNode[] = []
  private _isLoading = false
  private _disposed = false
  private _rebuildTimeout: ReturnType<typeof setTimeout> | null = null
  /** In-flight refresh, so overlapping triggers share one pass. */
  private _refreshing: Promise<BimTreeNode[]> | null = null
  /** Set when a model changes mid-refresh; the current pass then runs again. */
  private _staleWhileRefreshing = false

  constructor(components: OBC.Components) {
    super(components)
    components.add(IfcClasses.uuid, this)

    const fragments = components.get(OBC.FragmentsManager)
    fragments.list.onItemSet.add(this.scheduleRefresh)
    fragments.list.onItemDeleted.add(this.scheduleRefresh)
  }

  get classes(): BimTreeNode[] {
    return this._classes
  }

  get isLoading(): boolean {
    return this._isLoading
  }

  private setLoadingState(isLoading: boolean): void {
    if (this._isLoading === isLoading) return
    this._isLoading = isLoading
    this.onLoadingStateChanged.trigger({ isLoading })
  }

  private scheduleRefresh = (): void => {
    if (this._disposed) return
    if (this._rebuildTimeout !== null) clearTimeout(this._rebuildTimeout)
    this._rebuildTimeout = setTimeout(() => {
      this._rebuildTimeout = null
      void this.refresh()
    }, REBUILD_DEBOUNCE_MS)
  }

  /** Rebuilds the class list. Concurrent calls share one pass. */
  async refresh(): Promise<BimTreeNode[]> {
    if (this._refreshing !== null) {
      this._staleWhileRefreshing = true
      return this._refreshing
    }

    this._refreshing = this.build().finally(() => {
      this._refreshing = null
    })

    const result = await this._refreshing

    if (this._staleWhileRefreshing && !this._disposed) {
      this._staleWhileRefreshing = false
      return this.refresh()
    }
    return result
  }

  private async build(): Promise<BimTreeNode[]> {
    this.setLoadingState(true)
    try {
      const fragments = this.components.get(OBC.FragmentsManager)
      if (fragments.list.size === 0) {
        this._classes = []
        this.onClassesChanged.trigger({ classes: this._classes })
        return this._classes
      }

      const classifier = this.components.get(OBC.Classifier)
      await classifier.byCategory({ classificationName: IFC_CLASS_CLASSIFICATION })

      const groups = classifier.list.get(IFC_CLASS_CLASSIFICATION)
      if (!groups) {
        this._classes = []
        this.onClassesChanged.trigger({ classes: this._classes })
        return this._classes
      }

      // Each group resolves its own query, so run them together.
      const resolved = await Promise.all(
        [...groups.entries()].map(async ([name, data]) => {
          try {
            return { name, items: await data.get() }
          } catch (error) {
            console.warn(`Failed to resolve IFC class "${name}":`, error)
            return null
          }
        }),
      )

      if (this._disposed) return this._classes

      this._classes = resolved
        .filter(entry => entry !== null && !isModelIdMapEmpty(entry.items))
        .map(entry => ({
          id: `ifc-class:${entry.name}`,
          // Verbatim IFC class name — never translated.
          label: entry.name,
          items: entry.items,
          count: modelIdMapSize(entry.items),
          children: [],
        }))
        .sort((a, b) => a.label.localeCompare(b.label))

      this.onClassesChanged.trigger({ classes: this._classes })
      return this._classes
    } catch (error) {
      console.error('Failed to classify models by IFC class:', error)
      this._classes = []
      this.onClassesChanged.trigger({ classes: this._classes })
      return this._classes
    } finally {
      this.setLoadingState(false)
    }
  }

  dispose(): void {
    this._disposed = true
    if (this._rebuildTimeout !== null) {
      clearTimeout(this._rebuildTimeout)
      this._rebuildTimeout = null
    }
    try {
      const fragments = this.components.get(OBC.FragmentsManager)
      fragments.list.onItemSet.remove(this.scheduleRefresh)
      fragments.list.onItemDeleted.remove(this.scheduleRefresh)
    } catch {
      // FragmentsManager is held back to last during Components.dispose(); if it
      // has already gone there is nothing left to unsubscribe from.
    }
    this._classes = []
    this.onClassesChanged.reset()
    this.onLoadingStateChanged.reset()
    this.onDisposed.trigger(IfcClasses.uuid)
    this.onDisposed.reset()
  }
}
