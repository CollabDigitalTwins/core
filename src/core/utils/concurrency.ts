// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** Runs `fn` over `items` with at most `limit` in flight, keeping results in input order; `onFulfilled` hears each success. */
export async function withConcurrencyLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>, onFulfilled?: (value: R) => void): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      let value: R
      try {
        value = await fn(items[i])
      }
      catch (reason) {
        results[i] = { status: 'rejected', reason }
        continue
      }
      results[i] = { status: 'fulfilled', value }
      onFulfilled?.(value)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

export function fulfilledValues<R>(results: PromiseSettledResult<R>[]): R[] {
  return results.flatMap(result => (result.status === 'fulfilled' ? [result.value] : []))
}

/** Every value in order, or the first rejection's reason thrown. */
export function allFulfilledOrThrow<R>(results: PromiseSettledResult<R>[]): R[] {
  const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (failed) throw failed.reason
  return fulfilledValues(results)
}
