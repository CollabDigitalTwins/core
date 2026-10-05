// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { DatasetsContext } from '../../store/Datasets/context'
import { PluginDatasetLookupContext } from '../host/pluginDatasetLookup'
import { PluginScopeProvider } from '../host/scope'
import { toPluginDataset } from '../host/toPluginDataset'

import { usePluginDataset } from './datasets'

import type { Dataset } from '../../types/datasetTypes'
import type { PluginContribution } from '../host/provider'

const REGISTERED = [
  { pluginId: 'wildfire', id: 'fires', name: 'Active fires', live: true },
  { pluginId: 'other', id: 'fires', name: 'Other fires', live: true },
] as PluginContribution<'map.datasets'>[]

function findDataset(pluginId: string, id: string) {
  const registration = REGISTERED.find(candidate => candidate.pluginId === pluginId && candidate.id === id)
  return registration && toPluginDataset(registration)
}

function wrapperWith(addedDatasets: Partial<Dataset>[], dispatch: (action: unknown) => void = () => null) {
  const value = {
    state: { datasets: { dataset: null, datasetId: null, datasets: [], addedDatasets, orgRefreshNonce: 0 } },
    dispatch,
  } as unknown as React.ContextType<typeof DatasetsContext>

  return ({ children }: React.PropsWithChildren) => (
    <DatasetsContext.Provider value={value}>
      <PluginDatasetLookupContext.Provider value={findDataset}>
        <PluginScopeProvider pluginId="wildfire">{children}</PluginScopeProvider>
      </PluginDatasetLookupContext.Provider>
    </DatasetsContext.Provider>
  )
}

describe('usePluginDataset', () => {
  it('is neither applied nor visible until the user adds it', () => {
    const { result } = renderHook(() => usePluginDataset('fires'), { wrapper: wrapperWith([]) })

    expect(result.current).toMatchObject({ applied: false, visible: false })
  })

  it('is visible once applied', () => {
    const { result } = renderHook(() => usePluginDataset('fires'), {
      wrapper: wrapperWith([{ id: 'plugin:wildfire:fires' }]),
    })

    expect(result.current).toMatchObject({ applied: true, visible: true })
  })

  it('stays applied but not visible when hidden from the applied list', () => {
    const { result } = renderHook(() => usePluginDataset('fires'), {
      wrapper: wrapperWith([{ id: 'plugin:wildfire:fires', visible: false }]),
    })

    expect(result.current).toMatchObject({ applied: true, visible: false })
  })

  it('never reports another plugin’s dataset of the same id', () => {
    const { result } = renderHook(() => usePluginDataset('fires'), {
      wrapper: wrapperWith([{ id: 'plugin:other:fires' }]),
    })

    expect(result.current.applied).toBe(false)
  })

  it('applies its own dataset as the Datasets menu would', () => {
    const dispatch = vi.fn()
    const { result } = renderHook(() => usePluginDataset('fires'), { wrapper: wrapperWith([], dispatch) })

    act(() => { result.current.apply() })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'ADD_DATASET_TO_MAP',
      payload: { dataset: expect.objectContaining({ id: 'plugin:wildfire:fires', name: 'Active fires', drawnByPlugin: 'wildfire' }) as unknown },
    })
  })

  it('shows a hidden dataset again rather than adding it twice', () => {
    const dispatch = vi.fn()
    const { result } = renderHook(() => usePluginDataset('fires'), {
      wrapper: wrapperWith([{ id: 'plugin:wildfire:fires', visible: false }], dispatch),
    })

    act(() => { result.current.apply() })

    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'TOGGLE_DATASET_VISIBILITY', payload: { datasetId: 'plugin:wildfire:fires' } })
  })

  it('does nothing when applying one already shown', () => {
    const dispatch = vi.fn()
    const { result } = renderHook(() => usePluginDataset('fires'), {
      wrapper: wrapperWith([{ id: 'plugin:wildfire:fires' }], dispatch),
    })

    act(() => { result.current.apply() })

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('removes only its own dataset from the map', () => {
    const dispatch = vi.fn()
    const { result } = renderHook(() => usePluginDataset('fires'), {
      wrapper: wrapperWith([{ id: 'plugin:wildfire:fires' }, { id: 'plugin:other:fires' }], dispatch),
    })

    act(() => { result.current.remove() })

    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'REMOVE_DATASET_FROM_MAP', payload: { datasetId: 'plugin:wildfire:fires' } })
  })

  it('cannot apply a dataset it never registered', () => {
    const dispatch = vi.fn()
    const { result } = renderHook(() => usePluginDataset('unregistered'), { wrapper: wrapperWith([], dispatch) })

    act(() => { result.current.apply() })

    expect(dispatch).not.toHaveBeenCalled()
  })
})
