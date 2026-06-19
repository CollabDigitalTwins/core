// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

type CacheValue<T> = {
  v: T
  e: number
}

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

export async function withServerCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  if (typeof window === 'undefined') {
    const ttlSeconds = Math.floor(ttlMs / 1000)
    try {
      const { getMemcache, setMemcache } = await import('../../../../../utils/memcache')
      
      const cached = await getMemcache<T>(key)
      if (cached !== null) {
        setCache(key, cached, ttlMs)
        return cached
      }
      
      const localCached = getCache<T>(key)
      if (localCached !== undefined) {
        return localCached
      }

      const result = await fn()
      
      try {
        await setMemcache(key, result, ttlSeconds)
      } catch (error) {
        console.warn('Memcache write failed:', error)
      }
      setCache(key, result, ttlMs)
      
      return result
    } catch (error) {
      console.warn('Memcache operations failed, falling back to local cache:', error)
      
      const localCached = getCache<T>(key)
      if (localCached !== undefined) {
        return localCached
      }

      const result = await fn()
      setCache(key, result, ttlMs)
      return result
    }
  }

  return withCache(key, ttlMs, fn)
}

export function buildValidationKey(source: string, id: string | number | undefined, version?: string | number | null) {
  return makeKey(['valid', source, id ?? '', version ?? ''])
}
