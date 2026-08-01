'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

/** Whether a keystroke is being aimed at somewhere the browser's own undo owns. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true

  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

interface Options {
  undo: () => void | Promise<void>
  /** Omit to bind undo only; the redo strokes then fall through untouched. */
  redo?: () => void | Promise<void>
  /** Set false to unbind, e.g. while a modal owns the keyboard. */
  enabled?: boolean
}

/**
 * Binds the undo and redo shortcuts for as long as the component is mounted.
 *
 * | Stroke | Action |
 * |--------|--------|
 * | `Ctrl+Z` / `Cmd+Z` | undo |
 * | `Ctrl+Y` / `Cmd+Y` | redo |
 * | `Ctrl+Shift+Z` / `Cmd+Shift+Z` | redo |
 *
 * Both redo strokes are bound because both are conventional: `Ctrl+Y` on
 * Windows, `Shift+Cmd+Z` on macOS, and plenty of users of either reach for the
 * other.
 *
 * Pair it with a `createUndoHistory` stack — `useUndoRedoShortcuts({ undo: () =>
 * history.undo(), redo: () => history.redo() })` — or with anything else that
 * moves between states. Mount it high enough that it outlives the panel the
 * change was made from, or the shortcut disappears the moment the user looks at
 * a different tab.
 *
 * Keystrokes aimed at a text field are left alone: inside a search box `Ctrl+Z`
 * should edit the text. That is also why `preventDefault` only happens on the
 * strokes actually handled here.
 */
export function useUndoRedoShortcuts({ undo, redo, enabled = true }: Options): void {
  // Kept in a ref so a caller passing inline arrows does not rebind every render.
  const handlers = React.useRef({ undo, redo })
  React.useEffect(() => {
    handlers.current = { undo, redo }
  }, [undo, redo])

  React.useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.altKey || event.repeat) return
      if (isEditableTarget(event.target)) return

      const key = event.key.toLowerCase()
      const isUndo = key === 'z' && !event.shiftKey
      const isRedo = key === 'y' || (key === 'z' && event.shiftKey)

      if (isUndo) {
        event.preventDefault()
        void handlers.current.undo()
        return
      }

      if (isRedo && handlers.current.redo) {
        event.preventDefault()
        void handlers.current.redo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
