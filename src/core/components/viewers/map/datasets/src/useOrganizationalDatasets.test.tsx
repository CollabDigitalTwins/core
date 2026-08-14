// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'

const session = vi.hoisted(() => ({ organizationId: 3 as number | undefined }))

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: '1', organizationId: session.organizationId } } }),
}))

import { useOrganizationalDatasets } from './useOrganizationalDatasets'

const realFetch = global.fetch

/** The instance being viewed. */
const DND_INSTANCE = { id: 3, name: 'dnd' } as any

/** An uploaded GeoJSON row as /api/files returns it, presigned URL included. */
const uploadedRow = {
  id: 1,
  type: 'map-file',
  tag: 'organizational-dataset',
  name: 'roads.geojson',
  url: 'https://minio.example.com/datasets/3/asset-123?X-Amz-Signature=abc',
  description: JSON.stringify({ geometryType: 'lines' }),
  uploadedAt: '2025-01-01',
}

beforeEach(() => {
  session.organizationId = 3
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
  it("lists the signed-in organization's own datasets", async () => {
    const { result } = renderHook(() => useOrganizationalDatasets({ organization: DND_INSTANCE }))

    await waitFor(() => expect(result.current.datasets).toHaveLength(1))
    expect(result.current.datasets![0].sourceUrl).toBe(uploadedRow.url)
  })

  it('stamps the dataset with the organization that owns it', async () => {
    const { result } = renderHook(() => useOrganizationalDatasets({ organization: DND_INSTANCE }))

    await waitFor(() => expect(result.current.datasets).toHaveLength(1))
    expect(result.current.datasets![0].organization).toBe(3)
  })

  it("lists nothing when viewing another organization's instance", async () => {
    session.organizationId = 4

    const { result } = renderHook(() => useOrganizationalDatasets({ organization: DND_INSTANCE }))

    await waitFor(() => expect(result.current.datasets).not.toBeNull())
    expect(result.current.datasets).toEqual([])
  })

  it("asks for nothing when viewing another organization's instance", async () => {
    session.organizationId = 4

    const { result } = renderHook(() => useOrganizationalDatasets({ organization: DND_INSTANCE }))

    await waitFor(() => expect(result.current.datasets).not.toBeNull())
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('fetches nothing before the session has loaded', async () => {
    session.organizationId = undefined

    const { result } = renderHook(() => useOrganizationalDatasets({ organization: DND_INSTANCE }))

    await waitFor(() => expect(result.current.datasets).not.toBeNull())
    expect(result.current.datasets).toEqual([])
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('reports visibility for the organization being viewed', async () => {
    const { result } = renderHook(() => useOrganizationalDatasets({ organization: DND_INSTANCE }))

    await waitFor(() => expect(result.current.datasets).toHaveLength(1))
    expect(result.current.orgVisibility.currentOrgId).toBe(3)
  })
})
