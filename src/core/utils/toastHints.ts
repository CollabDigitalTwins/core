// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { toast } from 'sonner'

const dismissedByCode = new Set<string | number>()
let hintRuns = 0

/** A fresh id for one run of a tool's hint: sonner revives a toast re-shown under an id it is still removing. */
export function newHintId(base: string): string {
  hintRuns += 1
  return `${base}:${hintRuns}`
}

/** Closes a hint toast without running its close handler: sonner fires `onDismiss` for code dismissals too. */
export function dismissHint(id: string | number) {
  if (toast.getToasts().some(shown => shown.id === id)) dismissedByCode.add(id)
  toast.dismiss(id)
}

/** An `onDismiss` that runs `onClose` only when the person closed the hint, not when `dismissHint` did. */
export function onHintClosed(id: string | number, onClose: () => void): () => void {
  return () => {
    if (dismissedByCode.delete(id)) return
    onClose()
  }
}
