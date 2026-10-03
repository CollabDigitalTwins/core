// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it } from 'vitest'

import { DatasetsContext } from '../../store/Datasets/context'
import { PluginScopeProvider } from '../host/scope'

import { usePluginDataset } from './datasets'

import type { Dataset } from '../../types/datasetTypes'

function wrapperWith(addedDatasets: Partial<Dataset>[]) {
  const value = {
    state: { datasets: { dataset: null, datasetId: null, datasets: [], addedDatasets, orgRefreshNonce: 0 } },
    dispatch: () => null,
  } as unknown as React.ContextType<typeof DatasetsContext>

  return ({ children }: React.PropsWithChildren) => (
    <DatasetsContext.Provider value={value}>
      <PluginScopeProvider pluginId="wildfire">{children}</PluginScopeProvider>
    </DatasetsContext.Provider>
  )
}

describe('usePluginDataset', () => {
  it('is neither applied nor visible until the user adds it', () => {
    const { result } = renderHook(() => usePluginDataset('fires'), { wrapper: wrapperWith([]) })

    expect(result.current).toEqual({ applied: false, visible: false })
  })

  it('is visible once applied', () => {
    const { result } = renderHook(() => usePluginDataset('fires'), {
      wrapper: wrapperWith([{ id: 'plugin:wildfire:fires' }]),
    })

    expect(result.current).toEqual({ applied: true, visible: true })
  })

  it('stays applied but not visible when hidden from the applied list', () => {
    const { result } = renderHook(() => usePluginDataset('fires'), {
      wrapper: wrapperWith([{ id: 'plugin:wildfire:fires', visible: false }]),
    })

    expect(result.current).toEqual({ applied: true, visible: false })
  })

  it('never reports another plugin’s dataset of the same id', () => {
    const { result } = renderHook(() => usePluginDataset('fires'), {
      wrapper: wrapperWith([{ id: 'plugin:other:fires' }]),
    })

    expect(result.current.applied).toBe(false)
  })
})
