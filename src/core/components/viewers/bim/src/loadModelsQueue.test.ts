// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

vi.mock('@thatopen/components', () => ({
  Component: class Component { constructor(public components: any) {} },
  Event: class Event { add() {} remove() {} trigger() {} },
  FragmentsManager: class {},
}))

const { LoadModels } = await import('./LoadModels')

// The constructor needs a live world; only the serialisation of load and unload is under test.
function loaderOver(list: Map<string, unknown>, order: string[]) {
  const loader = Object.create(LoadModels.prototype) as any
  loader.queues = new Map()
  loader.fragments = {
    core: {
      models: { list },
      disposeModel: vi.fn(async (id: string) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        list.delete(id)
        order.push(`disposed:${id}`)
      }),
    },
  }
  loader.loadNow = vi.fn(async (_url: string, id: string) => {
    order.push(`loaded:${id}`)
    list.set(id, { modelId: id })
    return { modelId: id }
  })
  return loader
}

describe('LoadModels load/unload ordering', () => {
  it('runs a load after the dispose it was queued behind, not during it', async () => {
    const order: string[] = []
    const list = new Map<string, unknown>([['a.frag', { modelId: 'a.frag' }]])
    const loader = loaderOver(list, order)

    const unloading = loader.unload('a.frag')
    const loading = loader.load('http://x', 'a.frag')
    await Promise.all([unloading, loading])

    expect(order).toEqual(['disposed:a.frag', 'loaded:a.frag'])
    expect(list.has('a.frag')).toBe(true)
  })

  it('does not queue work for a model that was never loaded', async () => {
    const order: string[] = []
    const loader = loaderOver(new Map(), order)

    await loader.unload('ghost.frag')

    expect(loader.fragments.core.disposeModel).not.toHaveBeenCalled()
  })

  it('keeps a failed load from stranding the queue for that model', async () => {
    const order: string[] = []
    const loader = loaderOver(new Map(), order)
    loader.loadNow = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(async () => { order.push('second'); return { modelId: 'a' } })

    await expect(loader.load('http://x', 'a.frag')).rejects.toThrow('offline')
    await loader.load('http://x', 'a.frag')

    expect(order).toEqual(['second'])
  })

  it('forgets the queue once the work has settled', async () => {
    const loader = loaderOver(new Map(), [])

    await loader.load('http://x', 'a.frag')
    await Promise.resolve()

    expect(loader.queues.size).toBe(0)
  })
})
