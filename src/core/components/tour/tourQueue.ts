'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

interface QueuedTour {
  token: symbol
  priority: number
}

let queue: QueuedTour[] = []
const listeners = new Set<() => void>()

const notify = () => listeners.forEach(listener => listener())

function enqueue(entry: QueuedTour) {
  const after = queue.findIndex(queued => queued.priority < entry.priority)
  queue = after === -1 ? [...queue, entry] : [...queue.slice(0, after), entry, ...queue.slice(after)]
  notify()
}

function dequeue(token: symbol) {
  queue = queue.filter(queued => queued.token !== token)
  notify()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

const head = () => queue[0]?.token

/** Higher-priority tours show first; equal priorities show in the order they opened. */
export const TourPriorityContext = React.createContext(0)

export const PLATFORM_TOUR_PRIORITY = 100

/** Whether this tour is the one on screen; every open tour waits its turn so only one shows at a time. */
export function useTourTurn(): boolean {
  const priority = React.useContext(TourPriorityContext)
  const [token] = React.useState(() => Symbol('tour'))
  React.useEffect(() => {
    enqueue({ token, priority })
    return () => dequeue(token)
  }, [token, priority])
  return React.useSyncExternalStore(subscribe, head, () => undefined) === token
}
