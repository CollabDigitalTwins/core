// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

import { addFileToMap } from './addFileToMap'

import type { Building, DbFile } from '../../../../types/dbTypes'

const dispatches = () => ({ fileDispatch: vi.fn(), bimDispatch: vi.fn() })

describe('addFileToMap', () => {
  it('hands a converted BIM model to the store the map draws models from', () => {
    const file = { id: 7, name: 'tower.frag', extension: 'frag' } as DbFile
    const { fileDispatch, bimDispatch } = dispatches()

    addFileToMap(file, { fileDispatch, bimDispatch })

    expect(bimDispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_BIM_TO_MAP',
      payload: { buildingModel: { bimFile: file, building: null } },
    })
    expect(fileDispatch).not.toHaveBeenCalled()
  })

  it('hands anything else to the file store, which draws its pin', () => {
    const file = { id: 8, name: 'plan.pdf', extension: 'pdf' } as DbFile
    const { fileDispatch, bimDispatch } = dispatches()

    addFileToMap(file, { fileDispatch, bimDispatch })

    expect(fileDispatch).toHaveBeenCalledWith({ type: 'ADD_TO_MAP', payload: { id: 8 } })
    expect(bimDispatch).not.toHaveBeenCalled()
  })

  it('treats a model as a model whatever the case of its extension', () => {
    const file = { id: 9, name: 'TOWER.FRAG', extension: 'FRAG' } as DbFile
    const { fileDispatch, bimDispatch } = dispatches()

    addFileToMap(file, { fileDispatch, bimDispatch })

    expect(bimDispatch).toHaveBeenCalled()
    expect(fileDispatch).not.toHaveBeenCalled()
  })

  it('routes a source IFC the same way, for a caller that only knows what was picked', () => {
    const file = { id: 10, name: 'tower.ifc', extension: 'ifc' } as DbFile
    const { fileDispatch, bimDispatch } = dispatches()

    addFileToMap(file, { fileDispatch, bimDispatch })

    expect(bimDispatch).toHaveBeenCalled()
    expect(fileDispatch).not.toHaveBeenCalled()
  })

  it('carries the building the placement linked, so the model draws against it', () => {
    const file = { id: 11, name: 'tower.frag', extension: 'frag' } as DbFile
    const building = { id: 3, buildingName: 'Dunton' } as Building
    const { fileDispatch, bimDispatch } = dispatches()

    addFileToMap(file, { fileDispatch, bimDispatch }, building)

    expect(bimDispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_BIM_TO_MAP',
      payload: { buildingModel: { bimFile: file, building } },
    })
  })
})
