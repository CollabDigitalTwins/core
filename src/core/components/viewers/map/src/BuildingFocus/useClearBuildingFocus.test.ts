// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ViewerNames } from '../../../../../types/'

import { useClearBuildingFocus } from './useClearBuildingFocus'

const { clear, state, emptyClickListeners } = vi.hoisted(() => ({
  clear: vi.fn(),
  state: { hasFocus: true, viewer: 'map' as string, datasetIds: ['building_focus'] as string[] },
  emptyClickListeners: [] as (() => void)[],
}))

vi.mock('./useBuildingFocus', () => ({
  useBuildingFocus: () => ({ clear, hasFocus: state.hasFocus, focus: vi.fn() }),
  FOCUS_DATASET_ID: 'building_focus',
}))
vi.mock('../../../../../store', () => ({
  DatasetsContext: React.createContext({ state: { datasets: { get addedDatasets() { return state.datasetIds.map(id => ({ id })) } } } }),
  MenusContext: React.createContext({ state: { menus: { get currentViewer() { return state.viewer } } } }),
  MapContext: React.createContext({
    state: {
      map: {
        mapClickManager: {
          onEmptyClick: (fn: () => void) => {
            emptyClickListeners.push(fn)
            return () => emptyClickListeners.splice(emptyClickListeners.indexOf(fn), 1)
          },
        },
      },
    },
  }),
}))

function pressEscape(init: KeyboardEventInit = {}, target: EventTarget = document.body) {
  const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(e)
  return e
}

describe('useClearBuildingFocus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.hasFocus = true
    state.viewer = ViewerNames.map
    state.datasetIds = ['building_focus']
    emptyClickListeners.length = 0
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('Escape clears focus on the map viewer', () => {
    renderHook(() => useClearBuildingFocus())
    pressEscape()
    expect(clear).toHaveBeenCalledTimes(1)
  })

  it('other keys do not clear', () => {
    renderHook(() => useClearBuildingFocus())
    pressEscape({ key: 'a' })
    expect(clear).not.toHaveBeenCalled()
  })

  it('Escape is ignored when event.defaultPrevented', () => {
    renderHook(() => useClearBuildingFocus())
    window.addEventListener('keydown', e => e.preventDefault(), { capture: true, once: true })
    pressEscape()
    expect(clear).not.toHaveBeenCalled()
  })

  it('Escape is ignored inside a text field', () => {
    renderHook(() => useClearBuildingFocus())
    const input = document.body.appendChild(document.createElement('input'))
    pressEscape({}, input)
    expect(clear).not.toHaveBeenCalled()
  })

  it('Escape is ignored when the current viewer is not the map', () => {
    state.viewer = ViewerNames.bim
    renderHook(() => useClearBuildingFocus())
    pressEscape()
    expect(clear).not.toHaveBeenCalled()
  })

  it('Escape is ignored without focus', () => {
    state.hasFocus = false
    renderHook(() => useClearBuildingFocus())
    pressEscape()
    expect(clear).not.toHaveBeenCalled()
  })

  it('an empty-map click clears focus', () => {
    renderHook(() => useClearBuildingFocus())
    emptyClickListeners.forEach(fn => fn())
    expect(clear).toHaveBeenCalledTimes(1)
  })

  it('an empty-map click is ignored off the map viewer', () => {
    state.viewer = ViewerNames.bim
    renderHook(() => useClearBuildingFocus())
    emptyClickListeners.forEach(fn => fn())
    expect(clear).not.toHaveBeenCalled()
  })

  it('clears focus when the focus dataset leaves the legend', () => {
    state.datasetIds = []
    renderHook(() => useClearBuildingFocus())
    expect(clear).toHaveBeenCalledTimes(1)
  })

  it('keeps focus while the focus dataset is on the map', () => {
    renderHook(() => useClearBuildingFocus())
    expect(clear).not.toHaveBeenCalled()
  })

  it('removes its listeners on unmount', () => {
    const { unmount } = renderHook(() => useClearBuildingFocus())
    unmount()
    pressEscape()
    expect(clear).not.toHaveBeenCalled()
    expect(emptyClickListeners).toHaveLength(0)
  })
})
