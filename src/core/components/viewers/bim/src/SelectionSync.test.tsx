// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react'
import * as React from 'react'

import { BimContext } from '../../../../store/BIM/context'

import { Selection } from './Selection'
import { SelectionSync } from './SelectionSync'

import type { ModelIdMap } from './lib/bimTree'
import type { SceneSelection } from './Selection/selectionState'

const { selected, listeners, sceneSelected, sceneListeners } = vi.hoisted(() => ({
  selected: { current: {} as ModelIdMap },
  listeners: [] as Array<() => void>,
  sceneSelected: { current: null as SceneSelection },
  sceneListeners: [] as Array<(next: SceneSelection) => void>,
}))

vi.mock('./lib/bimItemActions', () => ({
  getSelectedItems: () => selected.current,
  onSelectionChanged: (_components: unknown, listener: () => void) => {
    listeners.push(listener)
    return () => {
      const index = listeners.indexOf(listener)
      if (index >= 0) listeners.splice(index, 1)
    }
  },
}))

vi.mock('./Selection', () => ({
  Selection: class {},
}))

/** Stands in for the Highlighter changing the selection. */
function emitSelection(next: ModelIdMap) {
  selected.current = next
  for (const listener of [...listeners]) listener()
}

function renderSelectionSync(withComponents: boolean = true) {
  const dispatch = vi.fn()
  const selectionComponent = {
    get current() {
      return sceneSelected.current
    },
    onChanged: {
      add: (listener: (next: SceneSelection) => void) => {
        sceneListeners.push(listener)
      },
      remove: (listener: (next: SceneSelection) => void) => {
        const index = sceneListeners.indexOf(listener)
        if (index >= 0) sceneListeners.splice(index, 1)
      },
    },
  }
  const bimComponents = withComponents ? {
    get: (ctor: unknown) => {
      if (ctor === Selection) return selectionComponent
      throw new Error('unexpected component requested')
    },
  } : null
  const state = { bim: { bimComponents, selection: {} } }

  render(

    <BimContext.Provider value={{ state, dispatch } as any}>
      <SelectionSync />
    </BimContext.Provider>,
  )

  const trigger = (next: SceneSelection) => {
    sceneSelected.current = next
    for (const listener of [...sceneListeners]) listener(next)
  }

  return { dispatch, trigger }
}

afterEach(() => {
  selected.current = {}
  listeners.length = 0
  sceneSelected.current = null
  sceneListeners.length = 0
})

test('publishes the selection when the highlighter reports a change', () => {
  const { dispatch } = renderSelectionSync()

  emitSelection({ 'model-a': new Set([1, 2]) })

  expect(dispatch).toHaveBeenCalledWith({
    type: 'SET_BIM_SELECTION',
    payload: { selection: { 'model-a': new Set([1, 2]) } },
  })
})

test('publishes once on mount so an existing selection is not missed', () => {
  selected.current = { 'model-a': new Set([7]) }

  const { dispatch } = renderSelectionSync()

  expect(dispatch).toHaveBeenCalledWith({
    type: 'SET_BIM_SELECTION',
    payload: { selection: { 'model-a': new Set([7]) } },
  })
})

test('publishes an empty selection when it is cleared', () => {
  const { dispatch } = renderSelectionSync()
  emitSelection({ 'model-a': new Set([1]) })
  dispatch.mockClear()

  emitSelection({})

  expect(dispatch).toHaveBeenCalledWith({
    type: 'SET_BIM_SELECTION',
    payload: { selection: {} },
  })
})

test('does not subscribe before the viewer components exist', () => {
  const { dispatch } = renderSelectionSync(false)

  expect(listeners).toHaveLength(0)
  expect(dispatch).not.toHaveBeenCalled()
})

test('publishes a splat selection into the store', async () => {
  const { dispatch, trigger } = renderSelectionSync()

  trigger({ kind: 'splat', fileId: '41' })

  await waitFor(() => expect(dispatch).toHaveBeenCalledWith({
    type: 'SET_SCENE_SELECTION',
    payload: { sceneSelection: { kind: 'splat', fileId: '41' } },
  }))
})

test('clears the scene selection when a fragment is picked instead', async () => {
  const { dispatch, trigger } = renderSelectionSync()
  dispatch.mockClear()

  trigger({ kind: 'fragments', items: {} })

  await waitFor(() => expect(dispatch).toHaveBeenCalledWith({
    type: 'SET_SCENE_SELECTION',
    payload: { sceneSelection: null },
  }))
})
