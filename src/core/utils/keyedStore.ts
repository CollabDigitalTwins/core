// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

type Listener = () => void

export interface KeyedStore<V> {
  get: (key: string) => V | undefined
  set: (key: string, value: V) => void
  delete: (key: string) => void
  useValue: (key: string) => V | undefined
}

/** Module-scope values by key; a write re-renders only the components reading that key. */
export function createKeyedStore<V>(): KeyedStore<V> {
  const values = new Map<string, V>()
  const listeners = new Map<string, Set<Listener>>()

  const notify = (key: string) => {
    for (const listener of listeners.get(key) ?? []) listener()
  }

  const subscribe = (key: string, listener: Listener) => {
    const forKey = listeners.get(key) ?? new Set<Listener>()
    forKey.add(listener)
    listeners.set(key, forKey)
    return () => {
      forKey.delete(listener)
      if (forKey.size === 0) listeners.delete(key)
    }
  }

  const get = (key: string) => values.get(key)

  return {
    get,
    set: (key, value) => {
      if (values.has(key) && Object.is(values.get(key), value)) return
      values.set(key, value)
      notify(key)
    },
    delete: (key) => {
      if (values.delete(key)) notify(key)
    },
    useValue: (key) => {
      const subscribeToKey = React.useCallback((listener: Listener) => subscribe(key, listener), [key])
      return React.useSyncExternalStore(subscribeToKey, () => get(key), () => undefined)
    },
  }
}
