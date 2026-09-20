// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import * as React from 'react'

const { mutateMock, uploadFileWithProgressMock } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  uploadFileWithProgressMock: vi.fn(),
}))

vi.mock('swr', () => ({ mutate: (...args: unknown[]) => mutateMock(...args) }))
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { organizationId: 1 } } }) }))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), custom: vi.fn(), dismiss: vi.fn() }) }))
vi.mock(
  '../../../viewers/map/src/tools/AddTools/AddFile/utils/uploadToPresignedURLS',
  () => ({
    uploadFileWithProgress: (...args: unknown[]) => uploadFileWithProgressMock(...args),
  }),
)

import { useFileUploadWithProgress } from './useFileUploadWithProgress'

const realFetch = global.fetch

beforeEach(() => {
  mutateMock.mockReset()
  uploadFileWithProgressMock.mockReset().mockResolvedValue(undefined)
  if (!('randomUUID' in globalThis.crypto)) {
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      value: () => 'uuid-stub',
      configurable: true,
    })
  }
  vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('uuid-stub' as `${string}-${string}-${string}-${string}-${string}`)
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  global.fetch = realFetch
  vi.restoreAllMocks()
})

function makeFile(name = 'a.csv') {
  return new File(['hello'], name, { type: 'text/csv' })
}

describe('useFileUploadWithProgress', () => {
  it('happy path: presigned URL → upload → metadata POST → onUploadSuccess', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presignedUrl: 'http://minio/abc' }) })
      .mockResolvedValueOnce({ ok: true, statusText: 'OK', json: async () => ({ newFile: { id: 7 } }) }) as any

    const onUploadSuccess = vi.fn()
    const { result } = renderHook(() => useFileUploadWithProgress({ onUploadSuccess }))

    await act(async () => {
      await result.current.handleFileUpload(makeFile())
    })

    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/presigned-url-upload?asset=uuid-stub')
    expect(uploadFileWithProgressMock).toHaveBeenCalledWith('http://minio/abc', expect.any(File), expect.any(Function))

    const metadataCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1]
    expect(metadataCall[0]).toBe('/api/files/create')
    const body = JSON.parse(metadataCall[1].body)
    expect(body).toMatchObject({
      type: 'system',
      name: 'a.csv',
      assetId: 'uuid-stub',
      mimeType: 'text/csv',
      extension: 'csv',
      sizeBytes: 5,
    })
    // The shared intake owns naming, so a clash is suffixed rather than shadowing the first file.

    expect(mutateMock).toHaveBeenCalledWith(['files'])
    expect(onUploadSuccess).toHaveBeenCalledTimes(1)
    expect(result.current.uploadState).toEqual({ uploading: false, progress: 0 })
  })

  it('calls onUploadError if the presigned URL fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as any
    const onUploadError = vi.fn()
    const { result } = renderHook(() => useFileUploadWithProgress({ onUploadError }))

    await act(async () => { await result.current.handleFileUpload(makeFile()) })

    // The intake surfaces the cause on a toast; the callback just says which file failed.
    expect(onUploadError).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('a.csv'),
    }))
    expect(uploadFileWithProgressMock).not.toHaveBeenCalled()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('calls onUploadError when the metadata POST fails', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presignedUrl: 'http://minio' }) })
      .mockResolvedValueOnce({ ok: false, statusText: 'Internal Error', json: async () => ({}) }) as any

    const onUploadError = vi.fn()
    const { result } = renderHook(() => useFileUploadWithProgress({ onUploadError }))

    await act(async () => { await result.current.handleFileUpload(makeFile()) })

    expect(onUploadError).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('a.csv'),
    }))
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('suffixes a name that is already taken in the organization', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presignedUrl: 'http://minio/abc' }) })
      .mockResolvedValueOnce({ ok: true, statusText: 'OK', json: async () => ({ newFile: { id: 8 } }) }) as any

    const { result } = renderHook(() => useFileUploadWithProgress({ existingNames: ['a.csv'] }))

    await act(async () => { await result.current.handleFileUpload(makeFile()) })

    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].body)
    expect(body.name).toBe('a (1).csv')
  })

  it('handleAddFile injects a hidden file input and clicks it', () => {
    const { result } = renderHook(() => useFileUploadWithProgress({ acceptedFileTypes: '.csv' }))

    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})

    act(() => { result.current.handleAddFile() })

    const inputs = document.body.querySelectorAll('input[type="file"]')
    expect(inputs.length).toBeGreaterThan(0)
    const input = inputs[inputs.length - 1] as HTMLInputElement
    expect(input.accept).toBe('.csv')
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })
})
