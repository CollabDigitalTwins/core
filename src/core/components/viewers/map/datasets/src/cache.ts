// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

type CacheValue<T> = {
  v: T
  e: number
}

export const HOUR_MS = 60 * 60 * 1000
export const DAY_MS = 24 * HOUR_MS

const NS = 'datasetCache:'
const mem = new Map<string, CacheValue<any>>()

function now() {
  return Date.now()
}

export function makeKey(parts: Array<string | number | null | undefined>) {
  return NS + parts.map((p) => String(p ?? '')).join('|')
}

export function setCache<T>(key: string, value: T, ttlMs: number) {
  const rec: CacheValue<T> = { v: value, e: now() + ttlMs }
  try {
    mem.set(key, rec)
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(rec))
    }
  } catch {}
}

export function getCache<T>(key: string): T | undefined {
  try {
    const inMem = mem.get(key)
    if (inMem) {
      if (inMem.e > now()) return inMem.v as T
      mem.delete(key)
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(key)
      if (!raw) return undefined
      const parsed = JSON.parse(raw) as CacheValue<T>
      if (parsed?.e && parsed.e > now()) {
        mem.set(key, parsed)
        return parsed.v
      }
      // expired
      window.localStorage.removeItem(key)
    }
  } catch {}
  return undefined
}

export function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const existing = getCache<T>(key)
  if (existing !== undefined) return Promise.resolve(existing)
  return fn().then((res) => {
    setCache(key, res, ttlMs)
    return res
  })
}

/** The unexpired keys starting with `prefix`, from memory and localStorage in one pass. */
export function liveKeysWithPrefix(prefix: string): Set<string> {
  const keys = new Set<string>()
  for (const [key, rec] of mem) if (key.startsWith(prefix) && rec.e > now()) keys.add(key)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storage = window.localStorage
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key?.startsWith(prefix) && !keys.has(key) && getCache(key) !== undefined) keys.add(key)
      }
    }
  } catch {}
  return keys
}

export function buildValidationKey(source: string, id: string | number | undefined, version?: string | number | null) {
  return makeKey(['valid', source, id ?? '', version ?? ''])
}
