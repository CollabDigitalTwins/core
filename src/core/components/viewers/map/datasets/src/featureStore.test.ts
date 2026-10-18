// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

import { cachedFeatures } from './featureStore'

import type { FeatureCollection } from 'geojson'

const empty = (): FeatureCollection => ({ type: 'FeatureCollection', features: [] })
let keySeed = 0
const freshKey = () => `feature-store-test-${++keySeed}`

describe('cachedFeatures', () => {
  it('serves a finished load from memory', async () => {
    const key = freshKey()
    const load = vi.fn(async () => empty())
    await cachedFeatures(key, 60_000, load)
    await cachedFeatures(key, 60_000, load)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('never stores a load whose caller aborted, even when it finished', async () => {
    const key = freshKey()
    const controller = new AbortController()
    const aborted = cachedFeatures(key, 60_000, async () => {
      controller.abort()
      return empty()
    }, controller.signal)
    await expect(aborted).rejects.toMatchObject({ name: 'AbortError' })
    const load = vi.fn(async () => empty())
    await cachedFeatures(key, 60_000, load)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('starts afresh for a caller that joined a shared load the first caller aborted', async () => {
    const key = freshKey()
    const first = new AbortController()
    const shared = cachedFeatures(key, 60_000, () => new Promise<FeatureCollection>((_, reject) => {
      first.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }), first.signal)
    const load = vi.fn(async () => empty())
    const joined = cachedFeatures(key, 60_000, load)
    first.abort()
    await expect(shared).rejects.toMatchObject({ name: 'AbortError' })
    await expect(joined).resolves.toEqual(empty())
    expect(load).toHaveBeenCalledTimes(1)
  })
})
