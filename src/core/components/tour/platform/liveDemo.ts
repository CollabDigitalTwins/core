// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

interface Hold {
  count: number
  undo: () => void
  frame: number
}

const holds = new Map<string, Hold>()

/** Starts a demo on its first hold and undoes it one frame after the last release; returns a release. */
export function holdDemo(key: string, start: () => () => void): () => void {
  const existing = holds.get(key)
  if (existing) {
    cancelAnimationFrame(existing.frame)
    existing.count++
  } else {
    holds.set(key, { count: 1, undo: start(), frame: 0 })
  }
  let released = false
  return () => {
    if (released) return
    released = true
    const hold = holds.get(key)
    if (!hold || --hold.count > 0) return
    hold.frame = requestAnimationFrame(() => {
      holds.delete(key)
      hold.undo()
    })
  }
}
