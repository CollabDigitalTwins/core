// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, it, expect } from 'vitest'
import {
  PointCloudReducer,
  initialPointCloudState,
  PointCloudTools,
  CameraControl,
} from './reducer'

describe('PointCloudReducer', () => {
  it('INIT merges a partial over the initial state', () => {
    const s = PointCloudReducer(
      initialPointCloudState,
      { type: 'INIT', payload: { initialState: { ready: true, moveSpeed: 4 } } } as never,
    )
    expect(s.ready).toBe(true)
    expect(s.moveSpeed).toBe(4)
    // untouched fields fall back to the initial state
    expect(s.activeTool).toBe(PointCloudTools.NONE)
    expect(s.loadedPointCloudIds).toEqual([])
  })

  it('scalar setters each write their own field', () => {
    expect(PointCloudReducer(initialPointCloudState, { type: 'SET_READY', payload: { ready: true } } as never).ready).toBe(true)
    expect(PointCloudReducer(initialPointCloudState, { type: 'SET_ACTIVE_TOOL', payload: { activeTool: PointCloudTools.AREA_MEASUREMENT } } as never).activeTool).toBe(PointCloudTools.AREA_MEASUREMENT)
    expect(PointCloudReducer(initialPointCloudState, { type: 'SET_CAMERA_CONTROL', payload: { cameraControl: CameraControl.FIRST_PERSON } } as never).cameraControl).toBe(CameraControl.FIRST_PERSON)
    expect(PointCloudReducer(initialPointCloudState, { type: 'SET_MOVE_SPEED', payload: { moveSpeed: 7 } } as never).moveSpeed).toBe(7)
    expect(PointCloudReducer(initialPointCloudState, { type: 'SET_LOCK_ELEVATION', payload: { lockElevation: true } } as never).lockElevation).toBe(true)
    // pass a raw literal so the test doesn't depend on the CameraMode const-enum
    expect(PointCloudReducer(initialPointCloudState, { type: 'SET_CAMERA_PROJECTION', payload: { cameraProjection: 0 } } as never).cameraProjection).toBe(0)
  })

  it('LOAD_POINT_CLOUD appends + dedups; UNLOAD removes', () => {
    let s = PointCloudReducer(initialPointCloudState, { type: 'LOAD_POINT_CLOUD', payload: { id: 'p1' } } as never)
    s = PointCloudReducer(s, { type: 'LOAD_POINT_CLOUD', payload: { id: 'p1' } } as never)
    expect(s.loadedPointCloudIds).toEqual(['p1'])
    s = PointCloudReducer(s, { type: 'LOAD_POINT_CLOUD', payload: { id: 'p2' } } as never)
    expect(s.loadedPointCloudIds).toEqual(['p1', 'p2'])
    s = PointCloudReducer(s, { type: 'UNLOAD_POINT_CLOUD', payload: { id: 'p1' } } as never)
    expect(s.loadedPointCloudIds).toEqual(['p2'])
  })

  it('LOAD_POINT_CLOUD on an already-loaded id returns the same state reference', () => {
    const start = { ...initialPointCloudState, loadedPointCloudIds: ['p1'] }
    expect(PointCloudReducer(start, { type: 'LOAD_POINT_CLOUD', payload: { id: 'p1' } } as never)).toBe(start)
  })

  it('unknown action returns the same state', () => {
    expect(PointCloudReducer(initialPointCloudState, { type: 'NOPE' } as never)).toBe(initialPointCloudState)
  })
})
