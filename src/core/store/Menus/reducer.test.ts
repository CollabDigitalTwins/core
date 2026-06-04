import { describe, it, expect } from 'vitest'
import { MenusReducer, type MenusState } from './reducer'

const base = {
  currentViewer: 'map', rowsPerPage: 10, selectedTab: 'file',
  commentsVisibleInViewer: [], currentCommentId: null,
  sensorsVisibleInViewer: [], visibleSensorTypes: {}, visibleSensorTags: {},
  currentSensorId: null, currentSensorTypeId: null,
} as unknown as MenusState

describe('MenusReducer', () => {
  it('scalar setters each write their own field', () => {
    expect(MenusReducer(base, { type: 'SET_VIEWER', payload: { currentViewer: 'bim' } } as never).currentViewer).toBe('bim')
    expect(MenusReducer(base, { type: 'SET_PAGINATION_ROWS_PER_PAGE', payload: { rowsPerPage: 25 } } as never).rowsPerPage).toBe(25)
    expect(MenusReducer(base, { type: 'SET_SIDEBAR_SELECTED_TAB', payload: { selectedTab: 'sensors' } } as never).selectedTab).toBe('sensors')
    expect(MenusReducer(base, { type: 'SET_CURRENT_COMMENT_ID', payload: { commentId: 7 } } as never).currentCommentId).toBe(7)
    expect(MenusReducer(base, { type: 'SET_CURRENT_SENSOR_ID', payload: { currentSensorId: 3 } } as never).currentSensorId).toBe(3)
    expect(MenusReducer(base, { type: 'SET_CURRENT_SENSOR_TYPE_ID', payload: { currentSensorTypeId: 4 } } as never).currentSensorTypeId).toBe(4)
  })

  it('SHOW_COMMENTS_IN_VIEWER dedups; HIDE removes', () => {
    let s = MenusReducer(base, { type: 'SHOW_COMMENTS_IN_VIEWER', payload: { viewer: 'map' } } as never)
    s = MenusReducer(s, { type: 'SHOW_COMMENTS_IN_VIEWER', payload: { viewer: 'map' } } as never)
    expect(s.commentsVisibleInViewer).toEqual(['map'])
    s = MenusReducer(s, { type: 'HIDE_COMMENTS_IN_VIEWER', payload: { viewer: 'map' } } as never)
    expect(s.commentsVisibleInViewer).toEqual([])
  })

  it('TOGGLE_SENSOR_TYPE_VISIBILITY toggles on/off; force only shows (idempotent)', () => {
    const s = MenusReducer(base, { type: 'TOGGLE_SENSOR_TYPE_VISIBILITY', payload: { viewer: 'map', sensorTypeId: 1 } } as never)
    expect(s.visibleSensorTypes['map']).toEqual([1])
    // force=true while already visible → returns the same state reference
    expect(MenusReducer(s, { type: 'TOGGLE_SENSOR_TYPE_VISIBILITY', payload: { viewer: 'map', sensorTypeId: 1, force: true } } as never)).toBe(s)
    // no force, already visible → toggles off
    const off = MenusReducer(s, { type: 'TOGGLE_SENSOR_TYPE_VISIBILITY', payload: { viewer: 'map', sensorTypeId: 1 } } as never)
    expect(off.visibleSensorTypes['map']).toEqual([])
  })

  it('TOGGLE_SENSOR_TAG_VISIBILITY toggles tags on/off', () => {
    let s = MenusReducer(base, { type: 'TOGGLE_SENSOR_TAG_VISIBILITY', payload: { viewer: 'map', sensorTag: 'temp' } } as never)
    expect(s.visibleSensorTags['map']).toEqual(['temp'])
    s = MenusReducer(s, { type: 'TOGGLE_SENSOR_TAG_VISIBILITY', payload: { viewer: 'map', sensorTag: 'temp' } } as never)
    expect(s.visibleSensorTags['map']).toEqual([])
  })

  it('HIDE_ALL_SENSORS_IN_VIEWER removes the viewer + clears its sensor types', () => {
    const start = { ...base, sensorsVisibleInViewer: ['map', 'bim'], visibleSensorTypes: { map: [1, 2] } } as never
    const s = MenusReducer(start, { type: 'HIDE_ALL_SENSORS_IN_VIEWER', payload: { viewer: 'map' } } as never)
    expect(s.sensorsVisibleInViewer).toEqual(['bim'])
    expect(s.visibleSensorTypes['map']).toEqual([])
  })

  it('HIDE_ALL_SENSOR_TAGS_IN_VIEWER clears the viewer tags', () => {
    const start = { ...base, visibleSensorTags: { map: ['a', 'b'] } } as never
    const s = MenusReducer(start, { type: 'HIDE_ALL_SENSOR_TAGS_IN_VIEWER', payload: { viewer: 'map' } } as never)
    expect(s.visibleSensorTags['map']).toEqual([])
  })

  it('SHOW_ALL_SENSOR_IN_VIEWER is intentionally a no-op (returns same state)', () => {
    expect(MenusReducer(base, { type: 'SHOW_ALL_SENSOR_IN_VIEWER', payload: { viewer: 'map' } } as never)).toBe(base)
  })

  it('unknown action returns the same state', () => {
    expect(MenusReducer(base, { type: 'NOPE' } as never)).toBe(base)
  })
})
