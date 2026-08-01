// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

import { createUndoHistory, DEFAULT_UNDO_LIMIT } from './undoHistory'

/**
 * A value with a full undo/redo step recorded for each change, which is how a
 * feature holding immutable state uses this.
 */
function tracked(initial: string) {
  const history = createUndoHistory()
  const box = { value: initial }

  const set = (next: string, label?: string) => {
    const previous = box.value
    box.value = next
    history.push({
      label,
      undo: () => { box.value = previous },
      redo: () => { box.value = next },
    })
  }

  return { history, box, set }
}

describe('createUndoHistory', () => {
  it('starts empty', () => {
    const history = createUndoHistory()

    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
    expect(history.depth).toBe(0)
    expect(history.nextLabel).toBeUndefined()
    expect(history.nextRedoLabel).toBeUndefined()
  })

  it('reverses the most recent change first', async () => {
    const history = createUndoHistory()
    const order: string[] = []

    history.push({ undo: () => { order.push('first') } })
    history.push({ undo: () => { order.push('second') } })

    await history.undo()
    await history.undo()

    expect(order).toEqual(['second', 'first'])
  })

  it('resolves false when there is nothing to undo', async () => {
    const history = createUndoHistory()

    expect(await history.undo()).toBe(false)
  })

  it('awaits an async reversal before resolving', async () => {
    const history = createUndoHistory()
    let settled = false

    history.push({
      undo: async () => {
        await Promise.resolve()
        settled = true
      },
    })

    expect(await history.undo()).toBe(true)
    expect(settled).toBe(true)
  })

  it('restores state a caller closed over', async () => {
    const { history, box, set } = tracked('a')

    set('b')
    await history.undo()

    expect(box.value).toBe('a')
  })

  it('ignores pushes made while replaying', async () => {
    const history = createUndoHistory()

    // A feature whose commit path both applies a change and records it would
    // otherwise re-record the replay and never drain.
    history.push({ undo: () => history.push({ undo: () => {} }) })

    await history.undo()

    expect(history.canUndo).toBe(false)
  })

  it('drops a step even when reversing it throws', async () => {
    const history = createUndoHistory()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    history.push({ undo: () => { throw new Error('boom') } })

    expect(await history.undo()).toBe(true)
    expect(history.canUndo).toBe(false)
    warn.mockRestore()
  })

  it('keeps only the most recent steps once past the limit', async () => {
    const history = createUndoHistory({ limit: 3 })
    const reversed: number[] = []

    for (let i = 0; i < 5; i++) {
      history.push({ undo: () => { reversed.push(i) } })
    }

    expect(history.depth).toBe(3)
    await history.undo()
    await history.undo()
    await history.undo()

    expect(reversed).toEqual([4, 3, 2])
    expect(history.canUndo).toBe(false)
  })

  it('defaults to a bounded stack', () => {
    const history = createUndoHistory()

    for (let i = 0; i < DEFAULT_UNDO_LIMIT + 5; i++) {
      history.push({ undo: () => {} })
    }

    expect(history.depth).toBe(DEFAULT_UNDO_LIMIT)
  })

  it('reports the next label', () => {
    const history = createUndoHistory()

    history.push({ label: 'Colour IFCWALL', undo: () => {} })

    expect(history.nextLabel).toBe('Colour IFCWALL')
  })

  it('clears both stacks', async () => {
    const { history, set } = tracked('a')
    set('b')
    await history.undo()

    history.clear()

    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
  })
})

describe('redo', () => {
  it('resolves false when nothing has been undone', async () => {
    const { history } = tracked('a')

    expect(await history.redo()).toBe(false)
  })

  it('re-applies the change that was just undone', async () => {
    const { history, box, set } = tracked('a')

    set('b')
    await history.undo()
    expect(box.value).toBe('a')

    expect(await history.redo()).toBe(true)
    expect(box.value).toBe('b')
  })

  it('walks a run of changes back and forward again', async () => {
    const { history, box, set } = tracked('a')

    set('b')
    set('c')
    await history.undo()
    await history.undo()
    expect(box.value).toBe('a')

    await history.redo()
    await history.redo()

    expect(box.value).toBe('c')
    expect(history.canRedo).toBe(false)
  })

  it('puts a redone change back within reach of undo', async () => {
    const { history, box, set } = tracked('a')

    set('b')
    await history.undo()
    await history.redo()
    await history.undo()

    expect(box.value).toBe('a')
  })

  it('discards the redo branch once a new change is made', async () => {
    const { history, box, set } = tracked('a')

    set('b')
    await history.undo()
    set('c')

    expect(history.canRedo).toBe(false)
    expect(await history.redo()).toBe(false)
    expect(box.value).toBe('c')
  })

  it('reports the next redo label', async () => {
    const { history, set } = tracked('a')

    set('b', 'Set to b')
    await history.undo()

    expect(history.nextRedoLabel).toBe('Set to b')
  })

  it('drops the redo branch when undoing a step that cannot be re-applied', async () => {
    const { history, set } = tracked('a')

    set('b')
    // A step recorded without a `redo` — redoing past it would skip it.
    history.push({ undo: () => {} })

    await history.undo()

    expect(history.canRedo).toBe(false)
  })

  it('ignores pushes made while redoing', async () => {
    const history = createUndoHistory()

    history.push({
      undo: () => {},
      redo: () => history.push({ undo: () => {} }),
    })

    await history.undo()
    await history.redo()

    expect(history.depth).toBe(1)
  })
})

describe('amendTop', () => {
  it('adjusts the step just recorded instead of adding one', async () => {
    const history = createUndoHistory()
    const box = { value: 'a' }

    // What a coalesced slider drag does: record once, then keep the redo target
    // pointed at the latest value.
    history.push({
      undo: () => { box.value = 'a' },
      redo: () => { box.value = 'b' },
    })
    history.amendTop({ redo: () => { box.value = 'c' } })
    box.value = 'c'

    expect(history.depth).toBe(1)

    await history.undo()
    expect(box.value).toBe('a')

    await history.redo()
    expect(box.value).toBe('c')
  })

  it('does nothing on an empty stack', () => {
    const history = createUndoHistory()

    history.amendTop({ label: 'nope' })

    expect(history.canUndo).toBe(false)
  })
})

describe('subscribers', () => {
  it('is notified while subscribed, and not after', async () => {
    const history = createUndoHistory()
    const listener = vi.fn()

    const unsubscribe = history.onChanged(listener)
    history.push({ undo: () => {} })
    await history.undo()

    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    history.push({ undo: () => {} })

    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('keeps notifying the others when one throws', () => {
    const history = createUndoHistory()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const healthy = vi.fn()

    history.onChanged(() => { throw new Error('boom') })
    history.onChanged(healthy)
    history.push({ undo: () => {} })

    expect(healthy).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('does not notify when clearing an already empty history', () => {
    const history = createUndoHistory()
    const listener = vi.fn()
    history.onChanged(listener)

    history.clear()

    expect(listener).not.toHaveBeenCalled()
  })
})
