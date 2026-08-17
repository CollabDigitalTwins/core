// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render } from '@testing-library/react'
import * as React from 'react'

import { BimContext } from '../../../../store/BIM/context'

import { ModelsSync } from './ModelsSync'

/** Minimal stand-in for the two DataMap events ModelsSync listens to. */
const { fragments, listeners } = vi.hoisted(() => {
  const listeners = { set: [] as Array<() => void>, deleted: [] as Array<() => void> }
  const models = new Map<string, unknown>()

  return {
    listeners,
    fragments: {
      models,
      list: {
        keys: () => models.keys(),
        onItemSet: {
          add: (fn: () => void) => listeners.set.push(fn),
          remove: (fn: () => void) => listeners.set.splice(listeners.set.indexOf(fn), 1),
        },
        onItemDeleted: {
          add: (fn: () => void) => listeners.deleted.push(fn),
          remove: (fn: () => void) => listeners.deleted.splice(listeners.deleted.indexOf(fn), 1),
        },
      },
    },
  }
})

vi.mock('@thatopen/components', () => ({
  FragmentsManager: class {},
}))

function renderWithComponents(bimComponents: unknown) {
  const dispatch = vi.fn()
  const state = { bim: { bimComponents, modelIds: [] } }

  render(
     
    <BimContext.Provider value={{ state, dispatch } as any}>
      <ModelsSync />
    </BimContext.Provider>,
  )

  return dispatch
}

const components = { get: () => fragments }

afterEach(() => {
  fragments.models.clear()
  listeners.set.length = 0
  listeners.deleted.length = 0
})

test('publishes models already loaded when it mounts', () => {
  // The common case when switching back to the viewer: the model is there before
  // anything subscribes, so waiting for an event would leave the store empty.
  fragments.models.set('house.ifc', {})

  const dispatch = renderWithComponents(components)

  expect(dispatch).toHaveBeenCalledWith({
    type: 'SET_MODEL_IDS',
    payload: { modelIds: ['house.ifc'] },
  })
})

test('publishes again when a model finishes loading', () => {
  const dispatch = renderWithComponents(components)
  dispatch.mockClear()

  fragments.models.set('house.ifc', {})
  for (const listener of listeners.set) listener()

  expect(dispatch).toHaveBeenCalledWith({
    type: 'SET_MODEL_IDS',
    payload: { modelIds: ['house.ifc'] },
  })
})

test('publishes again when a model is removed', () => {
  fragments.models.set('house.ifc', {})
  const dispatch = renderWithComponents(components)
  dispatch.mockClear()

  fragments.models.delete('house.ifc')
  for (const listener of listeners.deleted) listener()

  expect(dispatch).toHaveBeenCalledWith({
    type: 'SET_MODEL_IDS',
    payload: { modelIds: [] },
  })
})

test('does not subscribe before the viewer components exist', () => {
  const dispatch = renderWithComponents(null)

  expect(listeners.set).toHaveLength(0)
  expect(dispatch).not.toHaveBeenCalled()
})

// Leaving the BIM viewer disposes the FragmentsManager, and `list` is a getter that throws
// "not initialized" from then on. Reading it again during cleanup crashed the unmount, which
// surfaced as an error boundary on the way from the viewer to any other page.
test('unsubscribes without touching the manager again, so a disposed one cannot crash the unmount', () => {
  let disposed = false
  const removed: string[] = []

  const live = {
    keys: () => new Map<string, unknown>().keys(),
    onItemSet: { add: () => {}, remove: () => removed.push('set') },
    onItemDeleted: { add: () => {}, remove: () => removed.push('deleted') },
  }

  const manager = {
    get list() {
      if (disposed) throw new Error('FragmentsManager not initialized. Call init() first.')
      return live
    },
  }

  const { unmount } = render(
     
    <BimContext.Provider value={{ state: { bim: { bimComponents: { get: () => manager }, modelIds: [] } }, dispatch: vi.fn() } as any}>
      <ModelsSync />
    </BimContext.Provider>,
  )

  disposed = true

  expect(() => unmount()).not.toThrow()
  expect(removed).toEqual(['set', 'deleted'])
})
