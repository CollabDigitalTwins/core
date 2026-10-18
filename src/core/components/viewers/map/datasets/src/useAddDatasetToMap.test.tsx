// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import * as React from 'react'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DatasetsContext } from '../../../../../store/Datasets/context'

import { isDatasetUnavailable } from './unavailableDatasets'
import { useAddDatasetToMap } from './useAddDatasetToMap'

import type { Dataset } from '../../../../../types/datasetTypes'

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))

const dispatch = vi.fn()

function renderAdder() {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DatasetsContext.Provider value={{ state: {} as never, dispatch }}>{children}</DatasetsContext.Provider>
  )
  return renderHook(() => useAddDatasetToMap(), { wrapper })
}

const dataset = (name: string, probe?: Dataset['probe']) => ({ id: name, name, probe }) as Dataset

afterEach(() => vi.clearAllMocks())

describe('useAddDatasetToMap', () => {
  it('adds a dataset that passes its check', async () => {
    const { result } = renderAdder()
    const parks = dataset('Parks', async () => {})

    let added: boolean | undefined
    await act(async () => { added = await result.current.addDataset(parks) })

    expect(added).toBe(true)
    expect(dispatch).toHaveBeenCalledWith({ type: 'ADD_DATASET_TO_MAP', payload: { dataset: parks } })
  })

  it('adds a dataset that has nothing to check', async () => {
    const { result } = renderAdder()
    await act(async () => { await result.current.addDataset(dataset('Local')) })
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  it('refuses a dataset that fails its check, explains why in plain words and stops offering it', async () => {
    const { result } = renderAdder()
    const secured = dataset('Secured', () => Promise.reject(new Error('AJAXError: Forbidden (403): https://maps.example.org/secret')))

    let added: boolean | undefined
    await act(async () => { added = await result.current.addDataset(secured) })

    expect(added).toBe(false)
    expect(dispatch).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Secured', expect.objectContaining({ description: 'reason.forbidden' }))
    expect(isDatasetUnavailable(secured)).toBe(true)
  })

  it('reports the dataset as checking until its check settles', async () => {
    const { result } = renderAdder()
    let settle!: () => void
    const slow = dataset('Slow', () => new Promise<void>((resolve) => { settle = resolve }))

    let pending!: Promise<boolean>
    act(() => { pending = result.current.addDataset(slow) })
    expect(result.current.checking.has('Slow')).toBe(true)

    await act(async () => {
      settle()
      await pending
    })
    expect(result.current.checking.has('Slow')).toBe(false)
  })
})
