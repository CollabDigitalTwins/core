// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import * as React from 'react'
import { renderHook } from '@testing-library/react'

// The hook imports the store barrel, which transitively pulls in next-auth/react
// (an ESM module the bundler can't transform out of the box). We mock the barrel
// down to just the BimContext re-export the hook actually consumes.
vi.mock('../../../../../store', async () => ({
  BimContext: (
    await vi.importActual<typeof import('../../../../../store/BIM/context')>(
      '../../../../../store/BIM/context',
    )
  ).BimContext,
}))

import { BimContext } from '../../../../../store/BIM/context'
import { useBuildingName } from './useBuildingName'

function withBim(value: any) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(BimContext.Provider, { value }, children)
}

function makeState({
  single,
  multi,
}: {
  single?: { id: number | string, name: string } | null
  multi?: Array<{ bimFile: { id: number | string, name: string } }>
}) {
  return {
    state: {
      bim: {
        buildingModel: { bimFile: single ?? null },
        bimModelsAddedToMap: multi ?? [],
      },
    },
    dispatch: vi.fn(),
  }
}

describe('useBuildingName', () => {
  it('resolves from bimModelsAddedToMap and strips the extension', () => {
    const wrapper = withBim(makeState({
      multi: [{ bimFile: { id: 7, name: 'office.ifc' } }],
    }))
    const { result } = renderHook(() => useBuildingName(), { wrapper })
    expect(result.current('7')).toBe('office')
  })

  it('falls back to the single buildingModel when the multi list misses', () => {
    const wrapper = withBim(makeState({
      single: { id: 11, name: 'tower.frag' },
      multi: [],
    }))
    const { result } = renderHook(() => useBuildingName(), { wrapper })
    expect(result.current('11')).toBe('tower')
  })

  it('returns the raw modelId when no match is found', () => {
    const wrapper = withBim(makeState({ multi: [] }))
    const { result } = renderHook(() => useBuildingName(), { wrapper })
    expect(result.current('999')).toBe('999')
  })

  it('does not strip a leading dot (e.g. dotfile)', () => {
    const wrapper = withBim(makeState({
      multi: [{ bimFile: { id: 1, name: '.hidden' } }],
    }))
    const { result } = renderHook(() => useBuildingName(), { wrapper })
    expect(result.current('1')).toBe('.hidden')
  })
})
