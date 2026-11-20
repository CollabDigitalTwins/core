// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

type TourDemo = 'legend'

export const TOUR_LEGEND_DEMO_TARGET = 'legend-demo'

let shown = new Set<TourDemo>()
const listeners = new Set<() => void>()

const notify = () => listeners.forEach(listener => listener())

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

/** Shows a stand-in the tour explains, such as an example legend; returns the function that hides it again. */
export function showTourDemo(demo: TourDemo): () => void {
  shown = new Set(shown).add(demo)
  notify()
  return () => {
    shown = new Set([...shown].filter(other => other !== demo))
    notify()
  }
}

/** Whether the tour is showing `demo` right now. */
export function useTourDemo(demo: TourDemo): boolean {
  return React.useSyncExternalStore(subscribe, () => shown.has(demo), () => false)
}
