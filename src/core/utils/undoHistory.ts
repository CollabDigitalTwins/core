// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** Default number of steps kept. Old steps fall off the bottom. */
export const DEFAULT_UNDO_LIMIT = 50

export interface UndoEntry {
  /**
   * Reverses the change. May be async; `undo()` awaits it, so a caller that
   * repaints the 3D view can return that work here.
   */
  undo: () => void | Promise<void>
  /**
   * Re-applies the change after an undo. Optional: a step without one is still
   * undoable, but undoing it empties the redo stack, since redoing anything
   * above it would skip a step and land on a state that never existed.
   */
  redo?: () => void | Promise<void>
  /** Short description of the change, for a tooltip or a log line. */
  label?: string
}

export interface UndoHistory {
  /**
   * Records how to reverse a change that has just happened, and discards
   * anything that was waiting to be redone. Ignored while an undo or redo is
   * running, so a replay cannot record itself as a new step.
   */
  push: (entry: UndoEntry) => void
  /**
   * Adjusts the step just recorded, without adding one.
   *
   * For coalescing: a slider drag records a step on its first tick, then amends
   * that step's `redo` as the value keeps changing, so the whole drag stays one
   * undo away and redo lands on where the drag finished. No-op on an empty stack.
   */
  amendTop: (changes: Partial<UndoEntry>) => void
  /** Reverses the most recent change. Resolves false when there is none. */
  undo: () => Promise<boolean>
  /** Re-applies the most recently undone change. Resolves false when there is none. */
  redo: () => Promise<boolean>
  /** Drops both stacks. */
  clear: () => void
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly depth: number
  /** Label of the change `undo()` would reverse next. */
  readonly nextLabel: string | undefined
  /** Label of the change `redo()` would re-apply next. */
  readonly nextRedoLabel: string | undefined
  /** Subscribe to stack changes; returns the unsubscribe function. */
  onChanged: (listener: () => void) => () => void
}

/**
 * A plain undo/redo stack, deliberately free of React and of any BIM or map
 * types so anything in core can hold one.
 *
 * It stores *how to move between states* rather than snapshots, which suits both
 * styles: a feature that keeps immutable state closes over the old and new
 * values, and one that mutates pushes the inverse operation.
 *
 * ```ts
 * const history = createUndoHistory()
 * const previous = items
 * const next = [...items, added]
 * items = next
 * history.push({
 *   label: 'Add item',
 *   undo: () => { items = previous },
 *   redo: () => { items = next },
 * })
 * ```
 */
export function createUndoHistory(options?: { limit?: number }): UndoHistory {
  const limit = Math.max(1, options?.limit ?? DEFAULT_UNDO_LIMIT)

  let undone: UndoEntry[] = []
  let redoable: UndoEntry[] = []
  let replaying = false
  const listeners = new Set<() => void>()

  const notify = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch (error) {
        console.warn('[undoHistory] listener failed:', error)
      }
    }
  }

  /** Shared body of undo and redo: pop one side, run it, push onto the other. */
  const replay = async (
    from: UndoEntry[],
    to: UndoEntry[],
    run: (entry: UndoEntry) => void | Promise<void>,
    label: string,
  ): Promise<boolean> => {
    const entry = from.pop()
    if (!entry) return false

    to.push(entry)
    if (to.length > limit) to.splice(0, to.length - limit)

    replaying = true
    try {
      await run(entry)
    } catch (error) {
      console.warn(`[undoHistory] ${label} failed:`, error)
    } finally {
      replaying = false
      notify()
    }
    return true
  }

  return {
    push(entry: UndoEntry): void {
      // A replay that re-runs the feature's own commit path would otherwise
      // record itself, and the stack would never drain.
      if (replaying) return

      undone.push(entry)
      if (undone.length > limit) undone = undone.slice(undone.length - limit)
      // The old redo branch described a future that no longer follows from here.
      redoable = []
      notify()
    },

    amendTop(changes: Partial<UndoEntry>): void {
      if (replaying) return

      const top = undone.at(-1)
      if (!top) return

      Object.assign(top, changes)
    },

    async undo(): Promise<boolean> {
      const entry = undone.at(-1)
      if (!entry) return false

      // Nothing above a step we cannot re-apply may stay redoable, or redo would
      // jump over it into a state that never existed.
      if (!entry.redo) redoable = []

      return replay(undone, entry.redo ? redoable : [], e => e.undo(), 'undo')
    },

    async redo(): Promise<boolean> {
      return replay(redoable, undone, e => e.redo?.(), 'redo')
    },

    clear(): void {
      if (undone.length === 0 && redoable.length === 0) return
      undone = []
      redoable = []
      notify()
    },

    get canUndo(): boolean {
      return undone.length > 0
    },

    get canRedo(): boolean {
      return redoable.length > 0
    },

    get depth(): number {
      return undone.length
    },

    get nextLabel(): string | undefined {
      return undone.at(-1)?.label
    },

    get nextRedoLabel(): string | undefined {
      return redoable.at(-1)?.label
    },

    onChanged(listener: () => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
