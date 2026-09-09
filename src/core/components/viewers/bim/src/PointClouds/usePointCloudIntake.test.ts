// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { endTask, getSnapshot } from '../../../../ui/FilesManager/src/uploadProgress'

import { usePointCloudIntake } from './usePointCloudIntake'

import type { ConversionEvent, ConversionWatcher } from '../../../shared/pointcloud/pointCloudConversion'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('swr', () => ({ mutate: vi.fn() }))
vi.mock('sonner', () => ({ toast: { custom: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() } }))

const { updateFileByIdMock } = vi.hoisted(() => ({ updateFileByIdMock: vi.fn(async () => ({})) }))
vi.mock('../../../../../hooks/files/files', () => ({ useUpdateFile: () => updateFileByIdMock }))

vi.mock('../../../shared/pointcloud/pointCloudConversion', () => ({
  createPointCloud: vi.fn(async () => ({ pointCloud: { id: 5 }, upload: { uploadUrl: 'https://minio/put' } })),
  startConversion: vi.fn(async () => ({ jobId: 'job-1' })),
  watchConversion: vi.fn(() => () => undefined),
}))

vi.mock('../../../map/src/tools/AddTools/AddFile/utils/uploadToPresignedURLS', () => ({
  uploadFileWithProgress: vi.fn(async (_u: string, _f: File, onProgress?: (p: number) => void) => {
    onProgress?.(50)
    return {} as XMLHttpRequest
  }),
}))

const { createPointCloud, startConversion, watchConversion } = await import('../../../shared/pointcloud/pointCloudConversion')

const options = { apiBase: 'https://pc', buildingId: 7, existingNames: [] as string[] }

describe('usePointCloudIntake', () => {
  beforeEach(() => {
    for (const task of getSnapshot()) endTask(task.id)
    updateFileByIdMock.mockClear()
  })

  it('creates, uploads and converts a laz', async () => {
    const { result } = renderHook(() => usePointCloudIntake(options))
    await act(async () => { await result.current.upload(new File([''], 'scan.laz')) })
    expect(createPointCloud).toHaveBeenCalledWith('scan', 'laz', 7)
    expect(startConversion).toHaveBeenCalledWith('https://pc', 5)
  })

  it('tells the converter laz for a copc, because that is what it is', async () => {
    const { result } = renderHook(() => usePointCloudIntake(options))
    await act(async () => { await result.current.upload(new File([''], 'scan.copc.laz')) })
    expect(createPointCloud).toHaveBeenCalledWith('scan', 'laz', 7)
  })

  it('accepts an e57', async () => {
    const { result } = renderHook(() => usePointCloudIntake(options))
    await act(async () => { await result.current.upload(new File([''], 'scan.e57')) })
    expect(createPointCloud).toHaveBeenCalledWith('scan', 'e57', 7)
  })

  it('publishes a task to the shared store while it runs', async () => {
    const { result } = renderHook(() => usePointCloudIntake(options))
    const seen: number[] = []
    const stop = (await import('../../../../ui/FilesManager/src/uploadProgress')).subscribe(() => {
      seen.push(getSnapshot().length)
    })
    await act(async () => { await result.current.upload(new File([''], 'scan.laz')) })
    stop()
    expect(Math.max(...seen)).toBeGreaterThan(0)
  })

  it('refuses an unsupported format without creating anything', async () => {
    const { result } = renderHook(() => usePointCloudIntake(options))
    await act(async () => { await result.current.upload(new File([''], 'notes.txt')) })
    expect(createPointCloud).not.toHaveBeenCalledWith('notes', 'txt', 7)
  })

  it('marks the file visible once conversion finishes', async () => {
    let deliverFinished: (() => void) | null = null
    vi.mocked(watchConversion).mockImplementation((_base, _job, w: ConversionWatcher) => {
      deliverFinished = () => w.onFinished?.({} as ConversionEvent)
      return () => undefined
    })

    const { result } = renderHook(() => usePointCloudIntake(options))
    await act(async () => { await result.current.upload(new File([''], 'scan.laz')) })
    await act(async () => { deliverFinished?.() })

    expect(updateFileByIdMock).toHaveBeenCalledWith(5, { isVisible: true })
  })

  it('finishes a conversion that completes after the component unmounted', async () => {
    let deliverFinished: (() => void) | null = null
    vi.mocked(watchConversion).mockImplementation((_base, _job, w: ConversionWatcher) => {
      let closed = false
      deliverFinished = () => { if (!closed) w.onFinished?.({} as ConversionEvent) }
      return () => { closed = true }
    })

    const { result, unmount } = renderHook(() => usePointCloudIntake(options))
    await act(async () => { await result.current.upload(new File([''], 'scan.laz')) })
    unmount()
    expect(getSnapshot().length).toBeGreaterThan(0)
    act(() => { deliverFinished?.() })
    expect(getSnapshot()).toEqual([])
  })
})
