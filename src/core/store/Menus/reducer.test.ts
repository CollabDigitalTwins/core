// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { MenusReducer, type MenusState } from './reducer'
import { ViewerNames } from '../../types/dbTypes'

function baseState(overrides: Partial<MenusState> = {}): MenusState {
  return {
    currentViewer: ViewerNames.map,
    rowsPerPage: 10,
    selectedTab: 'file',
    commentsVisibleInViewer: [],
    currentCommentId: null,
    sensorsVisibleInViewer: [],
    visibleSensorTypes: {},
    visibleSensorTags: {},
    currentSensorId: null,
    currentSensorTypeId: null,
    ...overrides,
  }
}

describe('MenusReducer', () => {
  it('SET_VIEWER updates currentViewer', () => {
    const next = MenusReducer(baseState(), {
      type: 'SET_VIEWER',
      payload: { currentViewer: ViewerNames.bim },
    } as any)
    expect(next.currentViewer).toBe(ViewerNames.bim)
  })

  it('SHOW_COMMENTS_IN_VIEWER adds the viewer once and dedupes on re-add', () => {
    let state = MenusReducer(baseState(), {
      type: 'SHOW_COMMENTS_IN_VIEWER',
      payload: { viewer: ViewerNames.map },
    } as any)
    expect(state.commentsVisibleInViewer).toEqual([ViewerNames.map])

    state = MenusReducer(state, {
      type: 'SHOW_COMMENTS_IN_VIEWER',
      payload: { viewer: ViewerNames.map },
    } as any)
    expect(state.commentsVisibleInViewer).toEqual([ViewerNames.map])
  })

  it('HIDE_COMMENTS_IN_VIEWER removes the viewer', () => {
    const state = baseState({ commentsVisibleInViewer: [ViewerNames.map, ViewerNames.bim] })
    const next = MenusReducer(state, {
      type: 'HIDE_COMMENTS_IN_VIEWER',
      payload: { viewer: ViewerNames.bim },
    } as any)
    expect(next.commentsVisibleInViewer).toEqual([ViewerNames.map])
  })

  it('HIDE_ALL_SENSORS_IN_VIEWER clears both sensorsVisibleInViewer and visibleSensorTypes for that viewer', () => {
    const state = baseState({
      sensorsVisibleInViewer: [ViewerNames.map, ViewerNames.bim],
      visibleSensorTypes: { [ViewerNames.map]: [1, 2], [ViewerNames.bim]: [3] },
    })
    const next = MenusReducer(state, {
      type: 'HIDE_ALL_SENSORS_IN_VIEWER',
      payload: { viewer: ViewerNames.map },
    } as any)
    expect(next.sensorsVisibleInViewer).toEqual([ViewerNames.bim])
    expect(next.visibleSensorTypes[ViewerNames.map]).toEqual([])
    expect(next.visibleSensorTypes[ViewerNames.bim]).toEqual([3])
  })

  it('TOGGLE_SENSOR_TYPE_VISIBILITY adds the type when not visible', () => {
    const next = MenusReducer(baseState(), {
      type: 'TOGGLE_SENSOR_TYPE_VISIBILITY',
      payload: { viewer: ViewerNames.map, sensorTypeId: 42 },
    } as any)
    expect(next.visibleSensorTypes[ViewerNames.map]).toEqual([42])
  })

  it('TOGGLE_SENSOR_TYPE_VISIBILITY removes the type when already visible', () => {
    const state = baseState({ visibleSensorTypes: { [ViewerNames.map]: [42, 99] } })
    const next = MenusReducer(state, {
      type: 'TOGGLE_SENSOR_TYPE_VISIBILITY',
      payload: { viewer: ViewerNames.map, sensorTypeId: 42 },
    } as any)
    expect(next.visibleSensorTypes[ViewerNames.map]).toEqual([99])
  })

  it('TOGGLE_SENSOR_TYPE_VISIBILITY with force=true is idempotent when already visible', () => {
    const state = baseState({ visibleSensorTypes: { [ViewerNames.map]: [42] } })
    const next = MenusReducer(state, {
      type: 'TOGGLE_SENSOR_TYPE_VISIBILITY',
      payload: { viewer: ViewerNames.map, sensorTypeId: 42, force: true },
    } as any)
    expect(next).toBe(state)
  })

  it('TOGGLE_SENSOR_TAG_VISIBILITY removes the tag when already visible', () => {
    const state = baseState({ visibleSensorTags: { [ViewerNames.map]: ['humidity', 'temp'] } })
    const next = MenusReducer(state, {
      type: 'TOGGLE_SENSOR_TAG_VISIBILITY',
      payload: { viewer: ViewerNames.map, sensorTag: 'humidity' },
    } as any)
    expect(next.visibleSensorTags[ViewerNames.map]).toEqual(['temp'])
  })

  it('returns state unchanged for an unknown action type', () => {
    const state = baseState()
    const next = MenusReducer(state, { type: 'UNKNOWN_ACTION', payload: {} } as any)
    expect(next).toBe(state)
  })

  it('returns state unchanged when payload viewer is missing', () => {
    const state = baseState()
    const next = MenusReducer(state, {
      type: 'SHOW_COMMENTS_IN_VIEWER',
      payload: { viewer: undefined as any },
    } as any)
    expect(next).toBe(state)
  })

  it('scalar setters each write their own field', () => {
    expect(MenusReducer(baseState(), {
      type: 'SET_PAGINATION_ROWS_PER_PAGE',
      payload: { rowsPerPage: 25 },
    } as any).rowsPerPage).toBe(25)
    expect(MenusReducer(baseState(), {
      type: 'SET_SIDEBAR_SELECTED_TAB',
      payload: { selectedTab: 'sensors' },
    } as any).selectedTab).toBe('sensors')
    expect(MenusReducer(baseState(), {
      type: 'SET_CURRENT_COMMENT_ID',
      payload: { commentId: 7 },
    } as any).currentCommentId).toBe(7)
    expect(MenusReducer(baseState(), {
      type: 'SET_CURRENT_SENSOR_ID',
      payload: { currentSensorId: 3 },
    } as any).currentSensorId).toBe(3)
    expect(MenusReducer(baseState(), {
      type: 'SET_CURRENT_SENSOR_TYPE_ID',
      payload: { currentSensorTypeId: 4 },
    } as any).currentSensorTypeId).toBe(4)
  })

  it('TOGGLE_SENSOR_TAG_VISIBILITY adds the tag when not visible', () => {
    const next = MenusReducer(baseState(), {
      type: 'TOGGLE_SENSOR_TAG_VISIBILITY',
      payload: { viewer: ViewerNames.map, sensorTag: 'temp' },
    } as any)
    expect(next.visibleSensorTags[ViewerNames.map]).toEqual(['temp'])
  })

  it('HIDE_ALL_SENSOR_TAGS_IN_VIEWER clears the viewer tags', () => {
    const state = baseState({ visibleSensorTags: { [ViewerNames.map]: ['a', 'b'] } })
    const next = MenusReducer(state, {
      type: 'HIDE_ALL_SENSOR_TAGS_IN_VIEWER',
      payload: { viewer: ViewerNames.map },
    } as any)
    expect(next.visibleSensorTags[ViewerNames.map]).toEqual([])
  })

  it('SHOW_ALL_SENSOR_IN_VIEWER is intentionally a no-op (returns same state)', () => {
    const state = baseState()
    expect(MenusReducer(state, {
      type: 'SHOW_ALL_SENSOR_IN_VIEWER',
      payload: { viewer: ViewerNames.map },
    } as any)).toBe(state)
  })
})
