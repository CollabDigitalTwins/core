// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react'
import * as React from 'react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BimContext } from '../../../../../store/BIM/context'


import { BimMeasurementManager } from '../BimMeasurements/BimMeasurementManager'

import { BimPointCloudSync } from './BimPointCloudSync'

import { PointCloudAlignment } from './PointCloudAlignment'
import { PLACEMENT_VERSION } from './pointCloudPlacementStore'

import type { AlignmentState } from './PointCloudAlignment'
import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'

const { clouds, fileHooks } = vi.hoisted(() => {
  const loaded = new Map<string, unknown>()
  return {
    clouds: {
      loaded,
      setups: [] as unknown[],
      failing: new Set<string>(),
      placements: [] as unknown[],
      setup: (config: unknown) => { clouds.setups.push(config) },
      ids: () => [...loaded.keys()],
      get: (id: string) => loaded.get(id),
      add: async (id: string, placement: unknown) => {
        clouds.placements.push({ id, placement })
        if (clouds.failing.has(id)) throw new Error('boom')
        loaded.set(id, { id })
      },
      remove: (id: string) => { loaded.delete(id) },
    },
    fileHooks: {
      files: [] as unknown[],
      isLoading: false,
      keyedTo: [] as (number | null)[],
      updateFile: vi.fn(() => Promise.resolve({})),
    },
  }
})

vi.mock('./index', () => ({ BimPointClouds: class {} }))
vi.mock('./PointCloudAlignment', () => ({ PointCloudAlignment: class {} }))
vi.mock('../BimMeasurements/BimMeasurementManager', () => ({ BimMeasurementManager: class {} }))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: { name?: string }) => `${key}:${values?.name ?? ''}` }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../../../../hooks/files/files', () => ({
  useFilesByBuildingId: () => ({ files: fileHooks.files, isLoading: fileHooks.isLoading }),
  useFile: (id: number | null) => {
    fileHooks.keyedTo.push(id)
    return { updateFile: fileHooks.updateFile }
  },
}))

function makeEvent<T>() {
  const listeners = new Set<(value: T) => void>()
  return {
    add: (fn: (value: T) => void) => listeners.add(fn),
    remove: (fn: (value: T) => void) => listeners.delete(fn),
    trigger: (value: T) => { for (const fn of [...listeners]) fn(value) },
    size: () => listeners.size,
  }
}

function newMeasurements() {
  return {
    sources: new Set<unknown>(),
    registerPickSource(source: unknown) { this.sources.add(source) },
    unregisterPickSource(source: unknown) { this.sources.delete(source) },
  }
}

function newAlignment() {
  return {
    setups: [] as unknown[],
    setup(config: unknown) { this.setups.push(config) },
    onChanged: makeEvent<AlignmentState | null>(),
    onCommitted: makeEvent<AlignmentState>(),
  }
}

let alignment = newAlignment()
let measurements = newMeasurements()

const bimComponents = {
  get: (Ctor: unknown) => {
    if (Ctor === PointCloudAlignment) return alignment
    if (Ctor === BimMeasurementManager) return measurements
    return clouds
  },
}
const world = { scene: {}, camera: {}, renderer: {} }

function renderSync(pointCloudIds: string[], pointcloudApiUrl?: string) {
  const dispatch = vi.fn()
  const state = { bim: { bimComponents, world, pointCloudIds } }
  const view = render(
    <BimContext.Provider value={{ state, dispatch } as never}>
      <BimPointCloudSync pointcloudApiUrl={pointcloudApiUrl} />
    </BimContext.Provider>,
  )
  return { dispatch, view }
}

beforeEach(() => {
  alignment = newAlignment()
  measurements = newMeasurements()
})

afterEach(() => {
  clouds.loaded.clear()
  clouds.setups.length = 0
  clouds.placements.length = 0
  clouds.failing.clear()
  fileHooks.files = []
  fileHooks.isLoading = false
  fileHooks.keyedTo.length = 0
  fileHooks.updateFile.mockReset()
  fileHooks.updateFile.mockResolvedValue({})
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
})

describe('BimPointCloudSync', () => {
  it('configures the component once the world exists', () => {
    renderSync([])
    expect(clouds.setups).toHaveLength(1)
  })

  it('loads every desired id', async () => {
    renderSync(['669', '670'])
    await waitFor(() => expect(clouds.ids()).toEqual(['669', '670']))
  })

  it('removes clouds that are no longer desired', async () => {
    const { view, dispatch } = renderSync(['669', '670'])
    await waitFor(() => expect(clouds.ids()).toHaveLength(2))

    view.rerender(
      <BimContext.Provider value={{ state: { bim: { bimComponents, world, pointCloudIds: ['670'] } }, dispatch } as never}>
        <BimPointCloudSync />
      </BimContext.Provider>,
    )

    expect(clouds.ids()).toEqual(['670'])
  })

  it('switches a cloud back off when it fails to load', async () => {
    clouds.failing.add('669')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => { })

    const { dispatch } = renderSync(['669'])

    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_POINT_CLOUD', payload: { pointCloudId: '669' } }),
    )
    warn.mockRestore()
  })

  it('does nothing until the world is ready', () => {
    const dispatch = vi.fn()
    render(
      <BimContext.Provider value={{ state: { bim: { bimComponents: null, world: null, pointCloudIds: ['669'] } }, dispatch } as never}>
        <BimPointCloudSync />
      </BimContext.Provider>,
    )
    expect(clouds.setups).toHaveLength(0)
    expect(clouds.ids()).toEqual([])
  })
})

describe('BimPointCloudSync placement', () => {
  const PLACED: PointCloudPlacement = { position: [1, 2, 3], rotation: [0, 0.5, 0], scale: 2, sourceUp: 'z' }
  const stored = { id: 669, name: 'basement scan', pointCloudTransform: { version: PLACEMENT_VERSION, ...PLACED } }

  it('loads a cloud at its stored placement', async () => {
    fileHooks.files = [stored]

    renderSync(['669'])

    await waitFor(() => expect(clouds.placements).toEqual([{ id: '669', placement: PLACED }]))
  })

  it('holds a cloud back until the file records arrive, so it never lands at the default first', async () => {
    fileHooks.isLoading = true
    const { view, dispatch } = renderSync(['669'])
    expect(clouds.placements).toEqual([])

    fileHooks.isLoading = false
    fileHooks.files = [stored]
    view.rerender(
      <BimContext.Provider value={{ state: { bim: { bimComponents, world, pointCloudIds: ['669'] } }, dispatch } as never}>
        <BimPointCloudSync />
      </BimContext.Provider>,
    )

    await waitFor(() => expect(clouds.placements).toEqual([{ id: '669', placement: PLACED }]))
  })

  it('keys the mutation to the cloud being aligned', async () => {
    renderSync(['669'])

    alignment.onChanged.trigger({ id: '669', placement: { ...PLACED }, pivot: null })

    await waitFor(() => expect(fileHooks.keyedTo.at(-1)).toBe(669))
  })

  it('writes the committed placement to the file', async () => {
    renderSync(['669'])

    alignment.onCommitted.trigger({ id: '669', placement: { ...PLACED }, pivot: null })

    await waitFor(() => expect(fileHooks.updateFile).toHaveBeenCalledWith({
      pointCloudTransform: { version: PLACEMENT_VERSION, ...PLACED },
    }))
  })

  it('writes nothing when the committed placement matches what is stored', async () => {
    fileHooks.files = [stored]
    renderSync(['669'])
    await waitFor(() => expect(clouds.placements).toHaveLength(1))

    alignment.onCommitted.trigger({ id: '669', placement: { ...PLACED }, pivot: null })

    expect(fileHooks.updateFile).not.toHaveBeenCalled()
  })

  it('survives a rejected write', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => { })
    fileHooks.updateFile.mockRejectedValueOnce(new Error('offline'))
    renderSync(['669'])

    alignment.onCommitted.trigger({ id: '669', placement: { ...PLACED }, pivot: null })

    await waitFor(() => expect(warn).toHaveBeenCalled())
    warn.mockRestore()
  })

  it('tells the user the placement was saved, naming the cloud', async () => {
    fileHooks.files = [{ id: 669, name: 'basement scan' }]
    renderSync(['669'])

    alignment.onCommitted.trigger({ id: '669', placement: { ...PLACED }, pivot: null })

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('saved:basement scan'))
  })

  it('tells the user when the placement could not be saved', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => { })
    fileHooks.files = [{ id: 669, name: 'basement scan' }]
    fileHooks.updateFile.mockRejectedValueOnce(new Error('offline'))
    renderSync(['669'])

    alignment.onCommitted.trigger({ id: '669', placement: { ...PLACED }, pivot: null })

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('saveFailed:basement scan'))
    warn.mockRestore()
  })

  it('stays quiet when the placement did not actually change', async () => {
    fileHooks.files = [stored]
    renderSync(['669'])
    await waitFor(() => expect(clouds.placements).toHaveLength(1))

    alignment.onCommitted.trigger({ id: '669', placement: { ...PLACED }, pivot: null })

    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('unsubscribes on unmount', () => {
    const { view } = renderSync(['669'])
    expect(alignment.onCommitted.size()).toBe(1)

    view.unmount()

    expect(alignment.onCommitted.size()).toBe(0)
    expect(alignment.onChanged.size()).toBe(0)
  })
})

describe('BimPointCloudSync measurement', () => {
  it('offers the clouds to the measurement tools as a pick source', () => {
    renderSync([])

    expect(measurements.sources.has(clouds)).toBe(true)
  })

  it('withdraws the pick source on unmount, so a torn-down scene is never picked', () => {
    const { view } = renderSync([])

    view.unmount()

    expect(measurements.sources.size).toBe(0)
  })
})
