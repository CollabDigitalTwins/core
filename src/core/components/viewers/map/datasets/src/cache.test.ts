import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeKey, setCache, getCache, withCache, buildValidationKey } from './cache'

describe('cache: makeKey / buildValidationKey', () => {
  it('makeKey namespaces + pipe-joins, coercing null/undefined to empty (0 and "" kept)', () => {
    expect(makeKey(['a', 1, null, undefined])).toBe('datasetCache:a|1||')
    expect(makeKey([0, ''])).toBe('datasetCache:0|')
  })

  it('buildValidationKey builds a stable valid-prefixed key', () => {
    expect(buildValidationKey('arcgis', 5)).toBe('datasetCache:valid|arcgis|5|')
    expect(buildValidationKey('arcgis', undefined, null)).toBe('datasetCache:valid|arcgis||')
    expect(buildValidationKey('ckan', 7, 'v2')).toBe('datasetCache:valid|ckan|7|v2')
  })
})

describe('cache: set/get/withCache (node env: in-memory + TTL)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('serves a live value before TTL, then returns undefined after expiry (and evicts)', () => {
    vi.setSystemTime(0)
    setCache('k-live', { hi: 1 }, 1000)
    expect(getCache('k-live')).toEqual({ hi: 1 })
    vi.setSystemTime(1001)
    expect(getCache('k-live')).toBeUndefined()
    // entry was deleted on the expired read, so it stays missing
    expect(getCache('k-live')).toBeUndefined()
  })

  it('getCache returns undefined for an unknown key', () => {
    expect(getCache('k-missing')).toBeUndefined()
  })

  it('withCache runs fn on a miss, caches the result, and skips fn on a hit', async () => {
    vi.setSystemTime(0)
    const fn = vi.fn().mockResolvedValue('RESULT')
    const a = await withCache('k-wc', 1000, fn)
    const b = await withCache('k-wc', 1000, fn)
    expect([a, b]).toEqual(['RESULT', 'RESULT'])
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('withCache re-runs fn after the cached entry expires', async () => {
    vi.setSystemTime(0)
    const fn = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')
    expect(await withCache('k-wc-exp', 1000, fn)).toBe('first')
    vi.setSystemTime(2000)
    expect(await withCache('k-wc-exp', 1000, fn)).toBe('second')
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
