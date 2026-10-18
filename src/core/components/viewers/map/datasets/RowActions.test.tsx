// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'

const { canMock, toastSuccess, toastError } = vi.hoisted(() => ({
  canMock: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }))
vi.mock('../../../../store', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ ability: { can: (...args: unknown[]) => canMock(...args) } }),
}))
vi.mock('../../../ui/', () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
  Checkbox: ({ checked, disabled, onCheckedChange }: any) => (
    <input type="checkbox" checked={!!checked} disabled={disabled} onChange={() => onCheckedChange?.()} />
  ),
}))
vi.mock('../../../ui/AlertDialog', () => ({
  AlertDialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))

import { DatasetsContext } from '../../../../store'

import RowActions from './RowActions'

import type { Dataset } from '../../../../types/datasetTypes'

const realFetch = global.fetch

const orgUpload = { id: 'org-minio-7', name: 'roads', organization: 3, datasetType: 'GeoJSON' } as unknown as Dataset
const tiledOrgUpload = { id: 'org_3_file_7', name: 'roads', organization: 3, datasetType: 'MVT' } as unknown as Dataset
const catalogRow = {
  id: 'open-1', name: 'wards', datasetType: 'GeoJSON', portal: { id: 5 }, publishedFileId: 9,
} as unknown as Dataset

function renderRow(dataset: Dataset) {
  const dispatch = vi.fn()
  const state = {
    datasets: { dataset: null, datasets: [], datasetId: null, addedDatasets: [], orgRefreshNonce: 0 },
  }
  render(
    <DatasetsContext.Provider value={{ state, dispatch } as never}>
      <RowActions dataset={dataset} isFavourite={false} onFavourite={vi.fn()} />
    </DatasetsContext.Provider>,
  )
  return { dispatch }
}

const deleteButton = () => screen.queryByTitle('deleteDataset')

async function confirmDelete() {
  await act(async () => { fireEvent.click(deleteButton()!) })
  await act(async () => { fireEvent.click(screen.getByText('deleteConfirm')) })
}

function fetchUrls() {
  return (global.fetch as any).mock.calls.map((c: unknown[]) => c[0])
}

function dispatchedTypes(dispatch: ReturnType<typeof vi.fn>) {
  return dispatch.mock.calls.map(([action]) => (action as { type: string }).type)
}

beforeEach(() => {
  canMock.mockReturnValue(true)
  toastSuccess.mockReset()
  toastError.mockReset()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch
})

afterEach(() => {
  global.fetch = realFetch
  vi.restoreAllMocks()
})

describe('RowActions — delete', () => {
  it('offers delete on the organization\'s own upload', () => {
    renderRow(orgUpload)
    expect(deleteButton()).toBeInTheDocument()
  })

  it('offers delete on the tiled form of that upload', () => {
    renderRow(tiledOrgUpload)
    expect(deleteButton()).toBeInTheDocument()
  })

  it('does not offer delete on a published open-data row, because the portal owns the dataset and only un-publish applies', () => {
    renderRow(catalogRow)
    expect(deleteButton()).not.toBeInTheDocument()
  })

  it('does not offer delete without the delete permission', () => {
    canMock.mockImplementation((action: string) => action !== 'delete')
    renderRow(orgUpload)
    expect(deleteButton()).not.toBeInTheDocument()
  })

  it('deletes the file and does not touch tiles for an untiled upload', async () => {
    renderRow(orgUpload)
    await confirmDelete()
    expect(fetchUrls()).toEqual(['/api/files/7'])
  })

  it('drops the tiles before deleting the file for a tiled upload', async () => {
    renderRow(tiledOrgUpload)
    await confirmDelete()
    expect(fetchUrls()).toEqual(['/api/datasets/publish-tiles', '/api/files/7'])
  })

  it('takes the layer off the map and refreshes the list', async () => {
    const { dispatch } = renderRow(orgUpload)
    await confirmDelete()
    expect(dispatchedTypes(dispatch)).toContain('REMOVE_DATASET_FROM_MAP')
    expect(dispatchedTypes(dispatch)).toContain('REFRESH_ORG_DATASETS')
  })

  it('reports success with a toast', async () => {
    renderRow(orgUpload)
    await confirmDelete()
    expect(toastSuccess).toHaveBeenCalled()
  })

  it('reports a failed delete and leaves the list alone', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }) as any
    const { dispatch } = renderRow(orgUpload)
    await confirmDelete()
    expect(toastError).toHaveBeenCalled()
    expect(dispatchedTypes(dispatch)).not.toContain('REFRESH_ORG_DATASETS')
  })

  it('deletes nothing until the dialog is confirmed', async () => {
    renderRow(orgUpload)
    await act(async () => { fireEvent.click(deleteButton()!) })
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('RowActions — map toasts', () => {
  it('toasts when a layer is applied to the map', async () => {
    renderRow(orgUpload)
    await act(async () => { fireEvent.click(screen.getByRole('checkbox')) })
    expect(toastSuccess).toHaveBeenCalled()
  })
})

describe('RowActions — checking a dataset before adding it', () => {
  it('shows the dataset as being checked, then adds it', async () => {
    let pass!: () => void
    const checked = { ...catalogRow, probe: () => new Promise<void>((resolve) => { pass = resolve }) } as Dataset
    const { dispatch } = renderRow(checked)

    await act(async () => { fireEvent.click(screen.getByRole('checkbox')) })
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByRole('progressbar')).toBeTruthy()
    expect(dispatchedTypes(dispatch)).not.toContain('ADD_DATASET_TO_MAP')

    await act(async () => { pass() })
    expect(dispatchedTypes(dispatch)).toContain('ADD_DATASET_TO_MAP')
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(toastSuccess).toHaveBeenCalled()
  })

  it('does not add a dataset that fails its check', async () => {
    const refused = { ...catalogRow, probe: () => Promise.reject(new Error('HTTP 403')) } as Dataset
    const { dispatch } = renderRow(refused)

    await act(async () => { fireEvent.click(screen.getByRole('checkbox')) })

    expect(dispatchedTypes(dispatch)).not.toContain('ADD_DATASET_TO_MAP')
    expect(toastError).toHaveBeenCalledWith('wards', expect.objectContaining({ description: 'reason.forbidden' }))
    expect(toastSuccess).not.toHaveBeenCalled()
  })
})
