// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ViewerNames } from '../../types/dbTypes'

import { MenusReducer, type MenusState } from './reducer'

function baseState(overrides: Partial<MenusState> = {}): MenusState {
  return {
    currentViewer: ViewerNames.map,
    rowsPerPage: 10,
    selectedTab: 'file',
    commentsVisibleInViewer: [],
    currentCommentId: null,
    focusedCommentId: null,
    focusRequestId: 0,
    pendingCommentAction: null,
    sensorsVisibleInViewer: [],
    visibleSensorTypes: {},
    visibleSensorTags: {},
    currentSensorId: null,
    currentSensorTypeId: null,
    focusedSensorId: null,
    sensorFocusRequestId: 0,
    pendingSensorAction: null,
    sensorLegendVisible: {},
    sensorLegendTypeId: {},
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

  it('SET_FOCUSED_COMMENT_ID sets the id and bumps focusRequestId each time', () => {
    const first = MenusReducer(baseState(), {
      type: 'SET_FOCUSED_COMMENT_ID',
      payload: { commentId: 5 },
    } as any)
    expect(first.focusedCommentId).toBe(5)
    expect(first.focusRequestId).toBe(1)

    // Re-focusing the same comment still advances the counter so viewers re-zoom.
    const second = MenusReducer(first, {
      type: 'SET_FOCUSED_COMMENT_ID',
      payload: { commentId: 5 },
    } as any)
    expect(second.focusedCommentId).toBe(5)
    expect(second.focusRequestId).toBe(2)
  })

  it('REQUEST_COMMENT_ACTION records the action and increments its requestId', () => {
    const first = MenusReducer(baseState(), {
      type: 'REQUEST_COMMENT_ACTION',
      payload: { commentId: 3, action: 'edit' },
    } as any)
    expect(first.pendingCommentAction).toEqual({ commentId: 3, action: 'edit', requestId: 1 })

    const second = MenusReducer(first, {
      type: 'REQUEST_COMMENT_ACTION',
      payload: { commentId: 3, action: 'reply' },
    } as any)
    expect(second.pendingCommentAction).toEqual({ commentId: 3, action: 'reply', requestId: 2 })
  })

  it('SHOW_ALL_SENSOR_IN_VIEWER is intentionally a no-op (returns same state)', () => {
    const state = baseState()
    expect(MenusReducer(state, {
      type: 'SHOW_ALL_SENSOR_IN_VIEWER',
      payload: { viewer: ViewerNames.map },
    } as any)).toBe(state)
  })

  describe('sensor focus + actions', () => {
    it('SET_FOCUSED_SENSOR_ID sets the id and bumps sensorFocusRequestId each time', () => {
      const first = MenusReducer(baseState(), {
        type: 'SET_FOCUSED_SENSOR_ID',
        payload: { sensorId: 7 },
      } as any)
      expect(first.focusedSensorId).toBe(7)
      expect(first.sensorFocusRequestId).toBe(1)

      // Re-focusing the same sensor still advances the counter so viewers re-zoom.
      const second = MenusReducer(first, {
        type: 'SET_FOCUSED_SENSOR_ID',
        payload: { sensorId: 7 },
      } as any)
      expect(second.focusedSensorId).toBe(7)
      expect(second.sensorFocusRequestId).toBe(2)
    })

    it('SET_FOCUSED_SENSOR_ID hands the legend back to the focused sensor type', () => {
      const pinned = baseState({
        currentViewer: ViewerNames.map,
        sensorLegendTypeId: { [ViewerNames.map]: 42, [ViewerNames.bim]: 7 },
      })
      const next = MenusReducer(pinned, {
        type: 'SET_FOCUSED_SENSOR_ID',
        payload: { sensorId: 7 },
      } as any)
      // Only the viewer the focus happened in; the other viewer keeps its own pin.
      expect(next.sensorLegendTypeId[ViewerNames.map]).toBeNull()
      expect(next.sensorLegendTypeId[ViewerNames.bim]).toBe(7)
    })

    it('SET_FOCUSED_SENSOR_ID keeps a pinned type when clearing focus', () => {
      // The legend dropdown clears focus right after pinning; that must not undo the pin.
      const pinned = baseState({ sensorLegendTypeId: { [ViewerNames.map]: 42 } })
      const next = MenusReducer(pinned, {
        type: 'SET_FOCUSED_SENSOR_ID',
        payload: { sensorId: null },
      } as any)
      expect(next.focusedSensorId).toBeNull()
      expect(next.sensorLegendTypeId).toEqual({ [ViewerNames.map]: 42 })
    })

    it('REQUEST_SENSOR_ACTION stores a monotonic edit request', () => {
      const first = MenusReducer(baseState(), {
        type: 'REQUEST_SENSOR_ACTION',
        payload: { sensorId: 3 },
      } as any)
      expect(first.pendingSensorAction).toEqual({ sensorId: 3, action: 'edit', requestId: 1 })

      const second = MenusReducer(first, {
        type: 'REQUEST_SENSOR_ACTION',
        payload: { sensorId: 5 },
      } as any)
      expect(second.pendingSensorAction).toEqual({ sensorId: 5, action: 'edit', requestId: 2 })
    })

    it('CLEAR_PENDING_SENSOR_ACTION resets to null and no-ops when already null', () => {
      const first = MenusReducer(baseState(), {
        type: 'REQUEST_SENSOR_ACTION',
        payload: { sensorId: 3 },
      } as any)
      const second = MenusReducer(first, {
        type: 'CLEAR_PENDING_SENSOR_ACTION',
        payload: undefined,
      } as any)
      expect(second.pendingSensorAction).toBeNull()

      const third = MenusReducer(second, {
        type: 'CLEAR_PENDING_SENSOR_ACTION',
        payload: undefined,
      } as any)
      expect(third).toBe(second)
    })
  })

  describe('sensor legend', () => {
    it('TOGGLE_SENSOR_LEGEND flips from the shown default and back', () => {
      const hidden = MenusReducer(baseState(), {
        type: 'TOGGLE_SENSOR_LEGEND',
        payload: { viewer: ViewerNames.map },
      } as any)
      expect(hidden.sensorLegendVisible[ViewerNames.map]).toBe(false)

      const shown = MenusReducer(hidden, {
        type: 'TOGGLE_SENSOR_LEGEND',
        payload: { viewer: ViewerNames.map },
      } as any)
      expect(shown.sensorLegendVisible[ViewerNames.map]).toBe(true)
    })

    it('TOGGLE_SENSOR_LEGEND sets explicitly when given a value', () => {
      const next = MenusReducer(baseState(), {
        type: 'TOGGLE_SENSOR_LEGEND',
        payload: { viewer: ViewerNames.map, visible: false },
      } as any)
      expect(next.sensorLegendVisible[ViewerNames.map]).toBe(false)

      // Idempotent: closing an already-closed legend keeps it closed.
      const again = MenusReducer(next, {
        type: 'TOGGLE_SENSOR_LEGEND',
        payload: { viewer: ViewerNames.map, visible: false },
      } as any)
      expect(again.sensorLegendVisible[ViewerNames.map]).toBe(false)
    })

    it('TOGGLE_SENSOR_LEGEND leaves the other viewer alone', () => {
      const next = MenusReducer(baseState(), {
        type: 'TOGGLE_SENSOR_LEGEND',
        payload: { viewer: ViewerNames.map, visible: false },
      } as any)
      expect(next.sensorLegendVisible[ViewerNames.bim]).toBeUndefined()
    })

    it('TOGGLE_SENSOR_TYPE_VISIBILITY pins the type it switches on', () => {
      const next = MenusReducer(baseState(), {
        type: 'TOGGLE_SENSOR_TYPE_VISIBILITY',
        payload: { viewer: ViewerNames.map, sensorTypeId: 10 },
      } as any)
      expect(next.visibleSensorTypes[ViewerNames.map]).toEqual([10])
      expect(next.sensorLegendTypeId[ViewerNames.map]).toBe(10)
    })

    it('TOGGLE_SENSOR_TYPE_VISIBILITY releases the pin when it switches that type off', () => {
      const on = baseState({
        visibleSensorTypes: { [ViewerNames.map]: [10] },
        sensorLegendTypeId: { [ViewerNames.map]: 10 },
      })
      const next = MenusReducer(on, {
        type: 'TOGGLE_SENSOR_TYPE_VISIBILITY',
        payload: { viewer: ViewerNames.map, sensorTypeId: 10 },
      } as any)
      expect(next.sensorLegendTypeId[ViewerNames.map]).toBeNull()
    })

    it('TOGGLE_SENSOR_TYPE_VISIBILITY keeps the pin when a different type is switched off', () => {
      const on = baseState({
        visibleSensorTypes: { [ViewerNames.map]: [10, 20] },
        sensorLegendTypeId: { [ViewerNames.map]: 10 },
      })
      const next = MenusReducer(on, {
        type: 'TOGGLE_SENSOR_TYPE_VISIBILITY',
        payload: { viewer: ViewerNames.map, sensorTypeId: 20 },
      } as any)
      expect(next.sensorLegendTypeId[ViewerNames.map]).toBe(10)
    })

    it('HIDE_ALL_SENSORS_IN_VIEWER releases the pin', () => {
      const on = baseState({
        visibleSensorTypes: { [ViewerNames.map]: [10] },
        sensorLegendTypeId: { [ViewerNames.map]: 10 },
      })
      const next = MenusReducer(on, {
        type: 'HIDE_ALL_SENSORS_IN_VIEWER',
        payload: { viewer: ViewerNames.map },
      } as any)
      expect(next.sensorLegendTypeId[ViewerNames.map]).toBeNull()
    })

    it('SET_SENSOR_LEGEND_TYPE_ID pins and clears per viewer', () => {
      const pinned = MenusReducer(baseState(), {
        type: 'SET_SENSOR_LEGEND_TYPE_ID',
        payload: { viewer: ViewerNames.bim, sensorTypeId: 12 },
      } as any)
      expect(pinned.sensorLegendTypeId).toEqual({ [ViewerNames.bim]: 12 })

      const cleared = MenusReducer(pinned, {
        type: 'SET_SENSOR_LEGEND_TYPE_ID',
        payload: { viewer: ViewerNames.bim, sensorTypeId: null },
      } as any)
      expect(cleared.sensorLegendTypeId).toEqual({ [ViewerNames.bim]: null })
    })
  })
})
