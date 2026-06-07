import { describe, it, expect, vi } from 'vitest'
// @thatopen/components is imported in the reducer only as a TYPE (erased at compile
// time), so importing the reducer does not pull the BIM runtime into the node test env.
import { BimReducer, type BimState } from './reducer'

const base = {
  bimComponents: null, world: null, fragments: null, modelId: null,
  modelIds: [], floorplans: [], grid: null,
  buildingModel: { bimFile: null, building: null },
  bimModelsAddedToMap: [],
  editingBimModel: null, bimModelName: null,
  bcfTopic: null, bcfTopics: [], bcfTopicId: null,
  modelUIState: {},
} as unknown as BimState

describe('BimReducer', () => {
  it('SET_COMPONENTS / SET_MODEL / SET_FLOORPLANS / SET_GRID write their fields', () => {
    const c = BimReducer(base, { type: 'SET_COMPONENTS', payload: { bimComponents: 'C', world: 'W', fragments: 'F' } } as never)
    expect([c.bimComponents, c.world, c.fragments]).toEqual(['C', 'W', 'F'])
    expect(BimReducer(base, { type: 'SET_MODEL', payload: { modelId: 'm1' } } as never).modelId).toBe('m1')
    expect(BimReducer(base, { type: 'SET_FLOORPLANS', payload: { floorplans: [1, 2] } } as never).floorplans).toEqual([1, 2])
    expect(BimReducer(base, { type: 'SET_GRID', payload: { grid: 'G' } } as never).grid).toBe('G')
  })

  it('DISPOSE-BIM nulls components/world/fragments/modelId', () => {
    const start = { ...base, bimComponents: 'C', world: 'W', fragments: 'F', modelId: 'm' } as never
    const s = BimReducer(start, { type: 'DISPOSE-BIM' } as never)
    expect([s.bimComponents, s.world, s.fragments, s.modelId]).toEqual([null, null, null, null])
  })

  it('TOGGLE_BIM_TO_MAP adds, then a second toggle removes it (dedup by bimFile.id)', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
    const payload = { buildingModel: { bimFile: { id: 1, name: 'a.ifc' }, building: null } }
    let s = BimReducer(base, { type: 'TOGGLE_BIM_TO_MAP', payload } as never)
    expect(s.bimModelsAddedToMap).toHaveLength(1)
    s = BimReducer(s, { type: 'TOGGLE_BIM_TO_MAP', payload } as never)
    expect(s.bimModelsAddedToMap).toHaveLength(0)
    logSpy.mockRestore()
  })

  it('REMOVE_BIM_FROM_MAP filters by file name; REMOVE_ALL clears', () => {
    const start = { ...base, bimModelsAddedToMap: [{ bimFile: { id: 1, name: 'a.ifc' } }, { bimFile: { id: 2, name: 'b.ifc' } }] } as never
    const s = BimReducer(start, { type: 'REMOVE_BIM_FROM_MAP', payload: { bimModelName: 'a.ifc' } } as never)
    expect(s.bimModelsAddedToMap.map((m: { bimFile: { name: string } }) => m.bimFile.name)).toEqual(['b.ifc'])
    expect(BimReducer(start, { type: 'REMOVE_ALL_BIM_FROM_MAP' } as never).bimModelsAddedToMap).toEqual([])
  })

  it('BCF topics: add / edit by guid / remove by guid', () => {
    let s = BimReducer(base, { type: 'ADD_BCF_TOPIC', payload: { bcfTopic: { guid: 'g1', title: 'T1' } } } as never)
    expect(s.bcfTopics).toHaveLength(1)
    s = BimReducer(s, { type: 'EDIT_BCF_TOPIC', payload: { bcfTopic: { guid: 'g1', title: 'T1b' } } } as never)
    expect((s.bcfTopics[0] as { title: string }).title).toBe('T1b')
    s = BimReducer(s, { type: 'REMOVE_BCF_TOPIC', payload: { bcfTopicId: 'g1' } } as never)
    expect(s.bcfTopics).toEqual([])
  })

  it('SET_MODEL_UI_STATE merges ui props per fileId', () => {
    let s = BimReducer(base, { type: 'SET_MODEL_UI_STATE', payload: { fileId: 5, isVisible: true } } as never)
    expect(s.modelUIState[5]).toEqual({ isVisible: true })
    s = BimReducer(s, { type: 'SET_MODEL_UI_STATE', payload: { fileId: 5, isGhost: true } } as never)
    expect(s.modelUIState[5]).toEqual({ isVisible: true, isGhost: true })
  })

  it('unknown action returns the same state', () => {
    expect(BimReducer(base, { type: 'NOPE' } as never)).toBe(base)
  })
})
