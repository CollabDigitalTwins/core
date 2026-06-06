import { describe, it, expect } from 'vitest'
import { DatasetReducer, type DatasetState } from './reducer'
import type { Dataset } from '../../types/datasetTypes'

const ds = (id: string, extra: Partial<Dataset> = {}) => ({ id, name: id, ...extra }) as unknown as Dataset
const base: DatasetState = {
  dataset: null,
  datasetId: null,
  datasets: [],
  addedDatasets: [],
  orgRefreshNonce: 0,
}

describe('DatasetReducer', () => {
  it('SET_DATASETS / ADD_DATASET', () => {
    const s1 = DatasetReducer(base, { type: 'SET_DATASETS', payload: { datasets: [ds('a')] } } as never)
    expect(s1.datasets.map((d) => d.id)).toEqual(['a'])
    const s2 = DatasetReducer(s1, { type: 'ADD_DATASET', payload: { dataset: ds('b') } } as never)
    expect(s2.datasets.map((d) => d.id)).toEqual(['a', 'b'])
  })

  it('ADD_DATASET_TO_MAP assigns incrementing order, sets current dataset, and dedups by name', () => {
    const s1 = DatasetReducer(base, { type: 'ADD_DATASET_TO_MAP', payload: { dataset: ds('a') } } as never)
    expect(s1.addedDatasets).toHaveLength(1)
    expect(s1.addedDatasets[0].order).toBe(0)
    expect(s1.dataset?.id).toBe('a')

    const s2 = DatasetReducer(s1, { type: 'ADD_DATASET_TO_MAP', payload: { dataset: ds('b') } } as never)
    expect(s2.addedDatasets.map((d) => d.order)).toEqual([0, 1])

    const s3 = DatasetReducer(s2, { type: 'ADD_DATASET_TO_MAP', payload: { dataset: ds('a') } } as never)
    expect(s3.addedDatasets).toHaveLength(2) // 'a' already added (by name) → no duplicate
  })

  it('TOGGLE_DATASET_VISIBILITY flips the visible flag', () => {
    const s0: DatasetState = { ...base, addedDatasets: [ds('a', { visible: true } as Partial<Dataset>)] }
    const s1 = DatasetReducer(s0, { type: 'TOGGLE_DATASET_VISIBILITY', payload: { datasetId: 'a' } } as never)
    expect((s1.addedDatasets[0] as { visible?: boolean }).visible).toBe(false)
    const s2 = DatasetReducer(s1, { type: 'TOGGLE_DATASET_VISIBILITY', payload: { datasetId: 'a' } } as never)
    expect((s2.addedDatasets[0] as { visible?: boolean }).visible).toBe(true)
  })

  it('REMOVE_ALL_DATASETS clears addedDatasets but leaves the catalog', () => {
    const s0: DatasetState = { ...base, datasets: [ds('a')], addedDatasets: [ds('a'), ds('b')] }
    const next = DatasetReducer(s0, { type: 'REMOVE_ALL_DATASETS' } as never)
    expect(next.addedDatasets).toEqual([])
    expect(next.datasets.map((d) => d.id)).toEqual(['a'])
  })
})

describe('DatasetReducer — REFRESH_ORG_DATASETS', () => {
  it('increments orgRefreshNonce', () => {
    const next = DatasetReducer(base, { type: 'REFRESH_ORG_DATASETS' } as never)
    expect(next.orgRefreshNonce).toBe(1)
  })

  it('treats a missing nonce as 0 → 1', () => {
    const { orgRefreshNonce: _omit, ...noNonce } = base
    const next = DatasetReducer(noNonce as never, { type: 'REFRESH_ORG_DATASETS' } as never)
    expect(next.orgRefreshNonce).toBe(1)
  })

  it('SET_DATASETS preserves orgRefreshNonce', () => {
    const seeded: DatasetState = { ...base, orgRefreshNonce: 3 }
    const next = DatasetReducer(seeded, { type: 'SET_DATASETS', payload: { datasets: [] } } as never)
    expect(next.orgRefreshNonce).toBe(3)
  })
})
