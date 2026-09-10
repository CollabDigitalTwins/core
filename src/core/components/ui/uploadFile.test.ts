// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { uploadFile } from './uploadFile'

vi.mock('../viewers/map/src/tools/AddTools/AddFile/utils/uploadToPresignedURLS', () => ({
  uploadFileWithProgress: vi.fn(async (_url: string, _file: File, onProgress?: (p: number) => void) => {
    onProgress?.(50)
    onProgress?.(100)
    return {} as XMLHttpRequest
  }),
}))

const { uploadFileWithProgress } = await import('../viewers/map/src/tools/AddTools/AddFile/utils/uploadToPresignedURLS')

describe('uploadFile', () => {
  beforeEach(() => {
    vi.mocked(uploadFileWithProgress).mockClear()
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('presigned-url-upload')) {
        return { ok: true, json: async () => ({ presignedUrl: 'https://minio/put' }) } as Response
      }
      return { ok: true } as Response
    }) as typeof fetch
  })

  const args = {
    file: new File(['x'], 'plan.pdf', { type: 'application/pdf' }),
    buildingId: 7,
    user: { organizationId: 3 },
    uploadFile: vi.fn(async () => ({ id: 11 })),
  }

  it('routes through xhr and reports progress when onProgress is given', async () => {
    const seen: number[] = []
    await uploadFile({ ...args, onProgress: p => seen.push(p) })
    expect(uploadFileWithProgress).toHaveBeenCalledOnce()
    expect(seen).toEqual([50, 100])
  })

  it('keeps the fetch PUT when onProgress is omitted', async () => {
    await uploadFile(args)
    expect(uploadFileWithProgress).not.toHaveBeenCalled()
    expect(vi.mocked(global.fetch).mock.calls.some(([, init]) => (init as RequestInit)?.method === 'PUT')).toBe(true)
  })

  it('still writes the record once', async () => {
    const record = vi.fn(async () => ({ id: 11 }))
    await uploadFile({ ...args, uploadFile: record, onProgress: () => undefined })
    expect(record).toHaveBeenCalledOnce()
  })

  it('writes a placement point into the typed columns, not the deprecated position json', async () => {
    const record = vi.fn(async (_args: { fileData: any, buildingId: number }) => ({ id: 11 }))
    await uploadFile({ ...args, uploadFile: record, x: 1.5, y: 2.5, z: -3.5 })
    const sent = record.mock.calls[0][0].fileData
    expect(sent).toMatchObject({ x: 1.5, y: 2.5, z: -3.5 })
    expect(sent.bimRotation).toBeUndefined()
    expect(sent.scale).toBeUndefined()
  })
})
