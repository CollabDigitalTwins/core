import { describe, it, expect, vi } from 'vitest'
// maplibre-gl is imported in the reducer only as a TYPE (`map: Map | null`); mock it
// so importing the reducer doesn't pull the browser library into the node test env.
vi.mock('maplibre-gl', () => ({ Map: class {} }))
import { MapReducer, type MapState } from './reducer'

const base = {
  mapStyle: null, map: null, cursor: 'default', currentLocation: {},
  markerLocation: null, currentMapCameraPosition: null, currentUrl: '',
  currentSearchParams: {}, currentStringParams: '', geojson: null,
  addedLayers: [], clickedFeature: null, modelId: null,
  bimModelsAddedToMap: [], bimModelLoadingLocation: [],
  mapClickManager: null, mapHoverManager: null, dimensionsColour: '', terrainLevel: null,
} as unknown as MapState

describe('MapReducer', () => {
  it('UPDATE_MAP_STYLE / UPDATE_LOCATION / SET_CURSOR', () => {
    expect(MapReducer(base, { type: 'UPDATE_MAP_STYLE', payload: { mapStyle: 'dark' } } as never).mapStyle).toBe('dark')
    expect(MapReducer(base, { type: 'UPDATE_LOCATION', payload: { currentLocation: { country: 'CA' } } } as never).currentLocation).toEqual({ country: 'CA' })
    expect(MapReducer(base, { type: 'SET_CURSOR', payload: { cursor: 'pointer' } } as never).cursor).toBe('pointer')
  })

  it('ADD_LAYER appends only new layers (dedup)', () => {
    const s = MapReducer({ ...base, addedLayers: ['a'] }, { type: 'ADD_LAYER', payload: { addedLayers: ['a', 'b'] } } as never)
    expect(s.addedLayers).toEqual(['a', 'b'])
  })

  it('ADD_BIM_TO_MAP dedups; REMOVE_BIM_FROM_MAP; REMOVE_ALL_BIM_MODELS', () => {
    let s = MapReducer(base, { type: 'ADD_BIM_TO_MAP', payload: { modelId: 'm1' } } as never)
    s = MapReducer(s, { type: 'ADD_BIM_TO_MAP', payload: { modelId: 'm1' } } as never)
    expect(s.bimModelsAddedToMap).toEqual(['m1'])
    s = MapReducer(s, { type: 'ADD_BIM_TO_MAP', payload: { modelId: 'm2' } } as never)
    expect(s.bimModelsAddedToMap).toEqual(['m1', 'm2'])
    s = MapReducer(s, { type: 'REMOVE_BIM_FROM_MAP', payload: { modelId: 'm1' } } as never)
    expect(s.bimModelsAddedToMap).toEqual(['m2'])
    s = MapReducer(s, { type: 'REMOVE_ALL_BIM_MODELS' } as never)
    expect(s.bimModelsAddedToMap).toEqual([])
  })

  it('SET_BOUNDARY_GEOJSON sets the real `geojson` field (regression for the boundaryGeojson bug)', () => {
    const next = MapReducer(base, { type: 'SET_BOUNDARY_GEOJSON', payload: { geojson: 'GEO' } } as never)
    expect(next.geojson).toBe('GEO')
    expect((next as Record<string, unknown>).boundaryGeojson).toBeUndefined()
  })

  it('unknown action returns the same state', () => {
    expect(MapReducer(base, { type: 'NOPE' } as never)).toBe(base)
  })
})
