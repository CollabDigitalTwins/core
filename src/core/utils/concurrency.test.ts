// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { allFulfilledOrThrow, fulfilledValues, withConcurrencyLimit } from './concurrency'

describe('withConcurrencyLimit', () => {
  it('keeps input order and never runs more than the limit at once', async () => {
    let running = 0
    let peak = 0
    const results = await withConcurrencyLimit([30, 10, 20], 2, async (ms) => {
      running++
      peak = Math.max(peak, running)
      await new Promise(resolve => setTimeout(resolve, ms))
      running--
      return ms
    })
    expect(results.map(r => (r as PromiseFulfilledResult<number>).value)).toEqual([30, 10, 20])
    expect(peak).toBe(2)
  })

  it('reports each fulfilled value as it resolves, skipping rejections', async () => {
    const reported: number[] = []
    await withConcurrencyLimit([30, 10, 20], 3, async (ms) => {
      await new Promise(resolve => setTimeout(resolve, ms))
      if (ms === 20) throw new Error('boom')
      return ms
    }, value => reported.push(value))
    expect(reported).toEqual([10, 30])
  })
})

describe('settled results', () => {
  const settled: PromiseSettledResult<number>[] = [
    { status: 'fulfilled', value: 1 },
    { status: 'rejected', reason: new Error('boom') },
    { status: 'fulfilled', value: 3 },
  ]

  it('keeps only the fulfilled values, in order', () => {
    expect(fulfilledValues(settled)).toEqual([1, 3])
  })

  it('throws the first rejection, or returns every value', () => {
    expect(() => allFulfilledOrThrow(settled)).toThrow('boom')
    expect(allFulfilledOrThrow([settled[0], settled[2]])).toEqual([1, 3])
  })
})
