// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render } from '@testing-library/react'
import * as React from 'react'

import { BimContext } from '../../../../store/BIM/context'

import { SelectionSync } from './SelectionSync'

import type { ModelIdMap } from './lib/bimTree'

const { selected, listeners } = vi.hoisted(() => ({
  selected: { current: {} as ModelIdMap },
  listeners: [] as Array<() => void>,
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

/** Stands in for the Highlighter changing the selection. */
function emitSelection(next: ModelIdMap) {
  selected.current = next
  for (const listener of [...listeners]) listener()
}

function renderWithComponents(bimComponents: unknown) {
  const dispatch = vi.fn()
  const state = { bim: { bimComponents, selection: {} } }

  render(
     
    <BimContext.Provider value={{ state, dispatch } as any}>
      <SelectionSync />
    </BimContext.Provider>,
  )

  return dispatch
}

afterEach(() => {
  selected.current = {}
  listeners.length = 0
})

test('publishes the selection when the highlighter reports a change', () => {
  const dispatch = renderWithComponents({})

  emitSelection({ 'model-a': new Set([1, 2]) })

  expect(dispatch).toHaveBeenCalledWith({
    type: 'SET_BIM_SELECTION',
    payload: { selection: { 'model-a': new Set([1, 2]) } },
  })
})

test('publishes once on mount so an existing selection is not missed', () => {
  selected.current = { 'model-a': new Set([7]) }

  const dispatch = renderWithComponents({})

  expect(dispatch).toHaveBeenCalledWith({
    type: 'SET_BIM_SELECTION',
    payload: { selection: { 'model-a': new Set([7]) } },
  })
})

test('publishes an empty selection when it is cleared', () => {
  const dispatch = renderWithComponents({})
  emitSelection({ 'model-a': new Set([1]) })
  dispatch.mockClear()

  emitSelection({})

  expect(dispatch).toHaveBeenCalledWith({
    type: 'SET_BIM_SELECTION',
    payload: { selection: {} },
  })
})

test('does not subscribe before the viewer components exist', () => {
  const dispatch = renderWithComponents(null)

  expect(listeners).toHaveLength(0)
  expect(dispatch).not.toHaveBeenCalled()
})
