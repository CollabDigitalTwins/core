// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BimContext } from '../../../../../store/BIM/context'

import { BimPointCloudSync } from './BimPointCloudSync'

const { clouds } = vi.hoisted(() => {
  const loaded = new Map<string, unknown>()
  return {
    clouds: {
      loaded,
      setups: [] as unknown[],
      failing: new Set<string>(),
      setup: (config: unknown) => { clouds.setups.push(config) },
      ids: () => [...loaded.keys()],
      get: (id: string) => loaded.get(id),
      add: async (id: string) => {
        if (clouds.failing.has(id)) throw new Error('boom')
        loaded.set(id, { id })
      },
      remove: (id: string) => { loaded.delete(id) },
    },
  }
})

vi.mock('./index', () => ({ BimPointClouds: class {} }))

const bimComponents = { get: () => clouds }
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

afterEach(() => {
  clouds.loaded.clear()
  clouds.setups.length = 0
  clouds.failing.clear()
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
