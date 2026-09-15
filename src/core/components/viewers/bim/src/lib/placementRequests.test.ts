// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, it, expect, vi } from 'vitest'

import { requestPlacement, subscribeToPlacementRequests } from './placementRequests'

describe('placementRequests', () => {
  it('reports that nothing is listening when the toolbar is absent', () => {
    expect(requestPlacement(new File([''], 'model.glb'))).toBe(false)
  })

  it('hands the file to the subscriber and reports it was taken', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToPlacementRequests(listener)
    const file = new File([''], 'model.glb')

    expect(requestPlacement(file)).toBe(true)
    expect(listener).toHaveBeenCalledWith(file)

    unsubscribe()
  })

  it('stops delivering after unsubscribe, so a remounted toolbar cannot place twice', () => {
    const listener = vi.fn()
    subscribeToPlacementRequests(listener)()

    expect(requestPlacement(new File([''], 'model.glb'))).toBe(false)
    expect(listener).not.toHaveBeenCalled()
  })
})
