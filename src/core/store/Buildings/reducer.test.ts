// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, it, expect } from 'vitest'
import { BuildingsReducer, type BuildingsState } from './reducer'
import type { Building } from '../../types/dbTypes'

const bld = (id: number) => ({ id }) as unknown as Building
const base: BuildingsState = { buildings: [], building: null }

describe('BuildingsReducer', () => {
  it('SET-BUILDINGS sets the list (new object, no mutation)', () => {
    const buildings = [bld(1), bld(2)]
    const next = BuildingsReducer(base, { type: 'SET-BUILDINGS', payload: { buildings } } as never)
    expect(next.buildings).toBe(buildings)
    expect(next).not.toBe(base)
  })

  it('SET-CURRENT-BUILDING sets the selected building', () => {
    const next = BuildingsReducer(base, { type: 'SET-CURRENT-BUILDING', payload: { building: bld(5) } } as never)
    expect(next.building?.id).toBe(5)
  })

  it('REMOVE-BUILDING removes from the list and clears the selection if it was the removed one', () => {
    const state: BuildingsState = { buildings: [bld(1), bld(2)], building: bld(2) }
    const next = BuildingsReducer(state, { type: 'REMOVE-BUILDING', payload: { buildingId: 2 } } as never)
    expect(next.buildings.map((b) => b.id)).toEqual([1])
    expect(next.building).toBeNull()
  })

  it('REMOVE-BUILDING keeps the selection when a different building is removed', () => {
    const state: BuildingsState = { buildings: [bld(1), bld(2)], building: bld(1) }
    const next = BuildingsReducer(state, { type: 'REMOVE-BUILDING', payload: { buildingId: 2 } } as never)
    expect(next.building?.id).toBe(1)
  })

  it('CLEAR-BUILDINGS empties the list and the selection', () => {
    const state: BuildingsState = { buildings: [bld(1)], building: bld(1) }
    const next = BuildingsReducer(state, { type: 'CLEAR-BUILDINGS' } as never)
    expect(next.buildings).toEqual([])
    expect(next.building).toBeNull()
  })

  it('returns the same state for an unknown action', () => {
    expect(BuildingsReducer(base, { type: 'NOPE' } as never)).toBe(base)
  })
})
