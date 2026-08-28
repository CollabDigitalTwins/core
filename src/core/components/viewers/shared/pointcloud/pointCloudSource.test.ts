// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { createHttpPointCloudSource } from './pointCloudSource'

const record = {
  id: 669,
  name: 'PA_UCS_NOROOF',
  bucket: 'cdt',
  potreeMetadataFileKey: '669/potree-converted/metadata.json',
}

const okFetch = (body: unknown) => async () =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response

describe('createHttpPointCloudSource', () => {
  it('resolves a file id to the octree file name and directory', async () => {
    const source = createHttpPointCloudSource('https://pc.example.org', okFetch(record))

    expect(await source.resolve('669')).toEqual({
      fileName: 'metadata.json',
      baseUrl: 'https://pc.example.org/private/cdt/669/potree-converted/',
      name: 'PA_UCS_NOROOF',
    })
  })

  it('requests the record endpoint for that id', async () => {
    const seen: string[] = []
    const source = createHttpPointCloudSource('https://pc.example.org', async (url) => {
      seen.push(String(url))
      return { ok: true, status: 200, json: async () => record } as unknown as Response
    })

    await source.resolve('669')

    expect(seen).toEqual(['https://pc.example.org/point-cloud/669'])
  })

  it('fails loudly when the service rejects the request', async () => {
    const source = createHttpPointCloudSource('https://pc.example.org', async () =>
      ({ ok: false, status: 404, json: async () => ({}) }) as unknown as Response)

    await expect(source.resolve('669')).rejects.toThrow(/404/)
  })

  it('fails when the record carries no converted octree', async () => {
    const source = createHttpPointCloudSource('https://pc.example.org', okFetch({ ...record, potreeMetadataFileKey: null }))

    await expect(source.resolve('669')).rejects.toThrow(/not converted/i)
  })
})
