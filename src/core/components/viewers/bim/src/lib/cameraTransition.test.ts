// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pumpCameraTransition } from './cameraTransition'

const makeComponents = (renderer: unknown) => ({
  get: () => ({ world: { renderer } }),
}) as any

let pending: (() => void)[] = []

const flushFrames = async (count: number) => {
  for (let i = 0; i < count; i++) {
    const callbacks = pending
    pending = []
    for (const callback of callbacks) callback()
    await Promise.resolve()
  }
}

beforeEach(() => {
  pending = []
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
    pending.push(callback)
    return pending.length
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('pumpCameraTransition', () => {
  it('marks the on-demand renderer dirty so the transition actually advances', async () => {
    const renderer = { needsUpdate: false }
    let resolve = () => undefined as void
    const transition = new Promise<void>(done => { resolve = done })

    void pumpCameraTransition(makeComponents(renderer), transition)
    await flushFrames(1)

    expect(renderer.needsUpdate).toBe(true)
    resolve()
  })

  it('stops pumping once the transition settles', async () => {
    const renderer = { needsUpdate: false }
    let resolve = () => undefined as void
    const transition = new Promise<void>(done => { resolve = done })

    const pumped = pumpCameraTransition(makeComponents(renderer), transition)
    await flushFrames(2)
    resolve()
    await pumped
    await flushFrames(1)

    renderer.needsUpdate = false
    await flushFrames(3)
    expect(renderer.needsUpdate).toBe(false)
  })

  it('resolves even when the transition rejects, so a caller cannot hang on it', async () => {
    const renderer = { needsUpdate: false }

    await expect(
      pumpCameraTransition(makeComponents(renderer), Promise.reject(new Error('interrupted'))),
    ).resolves.toBeUndefined()
  })

  it('gives up rather than pumping forever when a transition never settles', async () => {
    const renderer = { needsUpdate: false }

    void pumpCameraTransition(makeComponents(renderer), new Promise<void>(() => undefined))
    await flushFrames(601)

    renderer.needsUpdate = false
    await flushFrames(2)
    expect(renderer.needsUpdate).toBe(false)
  })

  it('survives a world with no renderer', async () => {
    await expect(
      pumpCameraTransition(makeComponents(undefined), Promise.resolve()),
    ).resolves.toBeUndefined()
  })
})
