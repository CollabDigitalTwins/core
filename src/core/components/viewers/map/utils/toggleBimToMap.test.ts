// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

import { toggleBimToMap } from './toggleBimToMap'

import type { Building, DbFile } from '../../../../types/dbTypes'

const file = { id: 7, name: 'tower.ifc' } as DbFile
const building = { id: 3 } as Building

describe('toggleBimToMap', () => {
  it('sends the model and its building to the store', () => {
    const dispatch = vi.fn()

    toggleBimToMap(dispatch, file, building)

    expect(dispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_BIM_TO_MAP',
      payload: { buildingModel: { bimFile: file, building } },
    })
  })

  it('puts a model with no building on the map too, since it carries its own position', () => {
    const dispatch = vi.fn()

    toggleBimToMap(dispatch, file, null)

    expect(dispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_BIM_TO_MAP',
      payload: { buildingModel: { bimFile: file, building: null } },
    })
  })
})
