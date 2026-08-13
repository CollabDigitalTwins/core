// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'

const session = vi.hoisted(() => ({ organizationId: 2 as number | undefined }))

vi.mock('next/navigation', () => ({ usePathname: () => '/dnd' }))
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: '1', organizationId: session.organizationId } } }),
}))

import { useOrganizationalDatasets } from './useOrganizationalDatasets'

const realFetch = global.fetch
const TEST_MINIO_URL = 'https://minio.example.com/'

/** The instance being viewed. On /dnd this is DND, organization 3. */
const DND_INSTANCE = { id: 3, name: 'dnd' } as any

/** An uploaded GeoJSON row as /api/files returns it. */
const uploadedRow = {
  id: 1,
  type: 'map-file',
  tag: 'organizational-dataset',
  name: 'roads.geojson',
  assetId: 'asset-123',
  description: JSON.stringify({ bucket: 'pointclouds-demo', geometryType: 'lines' }),
  uploadedAt: '2025-01-01',
}

beforeEach(() => {
  session.organizationId = 2
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url === '/api/files') {
      return Promise.resolve({ ok: true, json: async () => ({ files: [uploadedRow] }) })
    }
    return Promise.reject(new Error(`unexpected url ${url}`))
  }) as unknown as typeof fetch
})

afterEach(() => {
  global.fetch = realFetch
  vi.restoreAllMocks()
})

describe('useOrganizationalDatasets', () => {
  it('builds the MinIO path from the org that owns the file, not the org being viewed', async () => {
    // /api/files is scoped to the signed-in user's organization, and the upload
    // route keys objects under that same org — so org 2 owns this file even
    // though we are looking at DND's instance (org 3).
    const { result } = renderHook(() => useOrganizationalDatasets({
      organization: DND_INSTANCE,
      minioBaseUrl: TEST_MINIO_URL,
    }))

    await waitFor(() => expect(result.current.datasets).toHaveLength(1))
    expect(result.current.datasets[0].sourceUrl).toBe('https://minio.example.com/pointclouds-demo/2/asset-123')
  })

  it('stamps the dataset with the org that owns it', async () => {
    const { result } = renderHook(() => useOrganizationalDatasets({
      organization: DND_INSTANCE,
      minioBaseUrl: TEST_MINIO_URL,
    }))

    await waitFor(() => expect(result.current.datasets).toHaveLength(1))
    expect(result.current.datasets[0].organization).toBe(2)
  })

  it('drops a dataset whose owning org this instance may not see', async () => {
    // Org 4 signed in, looking at DND (org 3). DND may see its own datasets and
    // the shared org's, not org 4's — and the file would 404 here anyway, so
    // hiding it beats listing an empty layer.
    session.organizationId = 4

    const { result } = renderHook(() => useOrganizationalDatasets({
      organization: DND_INSTANCE,
      minioBaseUrl: TEST_MINIO_URL,
    }))

    // Wait for the load to settle, not for fetch: fetch is called on the first
    // tick, so an empty-list assertion against it would pass before the load
    // had any chance to produce something.
    await waitFor(() => expect(result.current.datasets).not.toBeNull())
    expect(result.current.datasets).toEqual([])
  })

  it('fetches nothing from MinIO before the session has loaded', async () => {
    session.organizationId = undefined

    const { result } = renderHook(() => useOrganizationalDatasets({
      organization: DND_INSTANCE,
      minioBaseUrl: TEST_MINIO_URL,
    }))

    await waitFor(() => expect(console.warn).toHaveBeenCalledWith('No organizational datasets found'))
    expect(result.current.datasets).toEqual([])
    // Only the published-catalog read; no attempt at a MinIO object URL.
    const urls = (global.fetch as any).mock.calls.map((c: unknown[]) => c[0])
    expect(urls.every((u: string) => u === '/api/files')).toBe(true)
  })

  it('still reports visibility for the org being viewed, not the signed-in org', async () => {
    const { result } = renderHook(() => useOrganizationalDatasets({
      organization: DND_INSTANCE,
      minioBaseUrl: TEST_MINIO_URL,
    }))

    await waitFor(() => expect(result.current.datasets).toHaveLength(1))
    expect(result.current.orgVisibility.currentOrgId).toBe(3)
  })
})
