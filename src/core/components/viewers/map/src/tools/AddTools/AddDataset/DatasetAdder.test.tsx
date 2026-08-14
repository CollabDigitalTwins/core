// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'

const session = vi.hoisted(() => ({ organizationId: 2 as number | undefined }))
const { uploadMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  uploadMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: '1', organizationId: session.organizationId } } }),
}))
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock('sonner', () => ({ toast: { error: toastErrorMock, success: toastSuccessMock } }))
vi.mock('../AddFile/utils/uploadToPresignedURLS', () => ({
  uploadToPresignedUrl: (...args: unknown[]) => uploadMock(...args),
}))
vi.mock('../../../../../../ui/', () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
  Input: (props: any) => <input {...props} />,
}))

import { DatasetsContext } from '../../../../../../../store/Datasets/context'

import { DatasetAdder } from './DatasetAdder'

import type { DatasetActions } from '../../../../../../../store/Datasets/reducer'

const GEOJSON = JSON.stringify({
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
    properties: { name: 'a road' },
  }],
})

const realFetch = global.fetch

function renderAdder() {
  const dispatch = vi.fn()
  const state = {
    datasets: {
      dataset: null, datasets: [], datasetId: null, addedDatasets: [], orgRefreshNonce: 0,
    },
  }
  render(
    <DatasetsContext.Provider value={{ state, dispatch } as never}>
      <DatasetAdder />
    </DatasetsContext.Provider>,
  )
  return { dispatch }
}

/** Drop a GeoJSON file into the picker, then confirm with "Add to map". */
async function addGeoJsonFile() {
  const file = new File([GEOJSON], 'roads.geojson', { type: 'application/geo+json' })
  // jsdom's File has no Blob.text(); the component reads the file that way.
  Object.defineProperty(file, 'text', { value: async () => GEOJSON })
  await act(async () => {
    fireEvent.change(screen.getByLabelText(/or browse/i), { target: { files: [file] } })
  })
  await act(async () => {
    fireEvent.click(screen.getByText('Add to map'))
  })
}

function dispatchedTypes(dispatch: ReturnType<typeof vi.fn>) {
  return dispatch.mock.calls.map(([action]) => (action as DatasetActions).type)
}

function dispatchedAction(dispatch: ReturnType<typeof vi.fn>, type: string) {
  return dispatch.mock.calls
    .map(([action]) => action as DatasetActions)
    .find(action => action.type === type)
}

beforeEach(() => {
  session.organizationId = 2
  uploadMock.mockReset().mockResolvedValue(undefined)
  toastErrorMock.mockReset()
  toastSuccessMock.mockReset()
  vi.spyOn(console, 'warn').mockImplementation(() => {})

  // persistFile mints the assetId with crypto.randomUUID; not every jsdom has it.
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true })
  }
  if (!globalThis.crypto.randomUUID) {
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      value: () => 'test-uuid',
      configurable: true,
    })
  }

  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (String(url).startsWith('/api/presigned-url-upload')) {
      return Promise.resolve({ ok: true, json: async () => ({ presignedUrl: 'https://minio.example.com/put' }) })
    }
    if (url === '/api/files/create') {
      return Promise.resolve({ ok: true, json: async () => ({ newFile: { id: 42 } }) })
    }
    return Promise.reject(new Error(`unexpected url ${url}`))
  }) as unknown as typeof fetch
})

afterEach(() => {
  global.fetch = realFetch
  vi.restoreAllMocks()
})

describe('DatasetAdder — persisted uploads', () => {
  it('stamps the session dataset with the organization that owns the upload', async () => {
    const { dispatch } = renderAdder()

    await addGeoJsonFile()

    const added = dispatchedAction(dispatch, 'ADD_DATASET')
    expect((added as { payload: { dataset: { organization?: number } } }).payload.dataset.organization).toBe(2)
  })

  it('gives a persisted upload the id its re-hydrated form will have', async () => {
    // Otherwise this row shadows the refetched one and the publish action never shows.
    const { dispatch } = renderAdder()

    await addGeoJsonFile()

    const added = dispatchedAction(dispatch, 'ADD_DATASET')
    expect((added as { payload: { dataset: { id: string } } }).payload.dataset.id).toBe('org-minio-42')
  })

  it('falls back to a session id when the upload was not persisted', async () => {
    uploadMock.mockRejectedValue(new Error('minio down'))
    const { dispatch } = renderAdder()

    await addGeoJsonFile()

    const added = dispatchedAction(dispatch, 'ADD_DATASET')
    expect((added as { payload: { dataset: { id: string } } }).payload.dataset.id).toMatch(/^local-/)
  })

  it('confirms a persisted upload with a toast', async () => {
    renderAdder()

    await addGeoJsonFile()

    expect(toastSuccessMock).toHaveBeenCalled()
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it('refreshes the organizational list once the upload is persisted', async () => {
    const { dispatch } = renderAdder()

    await addGeoJsonFile()

    expect(dispatchedTypes(dispatch)).toContain('REFRESH_ORG_DATASETS')
  })

  it('leaves the dataset session-only when persistence fails', async () => {
    uploadMock.mockRejectedValue(new Error('minio down'))
    const { dispatch } = renderAdder()

    await addGeoJsonFile()

    expect(dispatchedTypes(dispatch)).toContain('ADD_DATASET')
    expect(dispatchedTypes(dispatch)).not.toContain('REFRESH_ORG_DATASETS')
    expect(toastErrorMock).toHaveBeenCalled()
  })

  it('reports a failed File row create rather than silently losing the dataset', async () => {
    // The bytes reach MinIO but nothing records them, so there is nothing to refetch.
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).startsWith('/api/presigned-url-upload')) {
        return Promise.resolve({ ok: true, json: async () => ({ presignedUrl: 'https://minio.example.com/put' }) })
      }
      if (url === '/api/files/create') return Promise.resolve({ ok: false, status: 500 })
      return Promise.reject(new Error(`unexpected url ${url}`))
    }) as unknown as typeof fetch

    const { dispatch } = renderAdder()

    await addGeoJsonFile()

    expect(dispatchedTypes(dispatch)).toContain('ADD_DATASET')
    expect(dispatchedTypes(dispatch)).not.toContain('REFRESH_ORG_DATASETS')
    expect(toastErrorMock).toHaveBeenCalled()
  })
})
