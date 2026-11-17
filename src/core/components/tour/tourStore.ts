// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** Remembers which tours a viewer has finished or hidden, so they do not reopen. */
export interface TourStore {
  isDone: (tourId: string) => boolean
  markDone: (tourId: string) => void
}

export type FlagStorage = Pick<Storage, 'getItem' | 'setItem'>

export interface BrowserTourStoreOptions {
  /** `session` brings the tour back in a new browser session; `local` keeps it closed on this device. */
  storage?: 'session' | 'local'
  /** Prefixes the storage key, so two plugins' tours with the same id stay apart. */
  namespace: string
}

const doneKey = (namespace: string, tourId: string) => `${namespace}.tour.${tourId}.hidden`

function browserStorage(kind: 'session' | 'local'): FlagStorage | null {
  try {
    if (typeof window === 'undefined') return null
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

/** A store over session or local storage; storage that is missing or throws reads as not done. */
export function browserTourStore(
  { storage = 'session', namespace }: BrowserTourStoreOptions,
  backing: FlagStorage | null = browserStorage(storage),
): TourStore {
  return {
    isDone: tourId => {
      try {
        return backing?.getItem(doneKey(namespace, tourId)) === '1'
      } catch {
        return false
      }
    },
    markDone: tourId => {
      try {
        backing?.setItem(doneKey(namespace, tourId), '1')
      } catch {
        // Private windows can refuse writes; the tour then simply returns next time.
      }
    },
  }
}
