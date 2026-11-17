'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { browserTourStore } from './tourStore'

import type { TourStore } from './tourStore'

const DEFAULT_NAMESPACE = 'cdt'

/** Whether a tour is showing: open until the viewer hides or finishes it, then closed for as long as `store` remembers. */
export function useTour(tourId: string, store?: TourStore) {
  const resolved = React.useMemo(() => store ?? browserTourStore({ namespace: DEFAULT_NAMESPACE }), [store])
  const [open, setOpen] = React.useState(() => !resolved.isDone(tourId))
  const start = React.useCallback(() => setOpen(true), [])
  const hide = React.useCallback(() => {
    resolved.markDone(tourId)
    setOpen(false)
  }, [resolved, tourId])
  return { open, start, hide }
}
