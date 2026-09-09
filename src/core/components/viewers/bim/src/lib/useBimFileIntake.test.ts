// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useBimFileIntake } from './useBimFileIntake'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { organizationId: 3 } } }) }))
vi.mock('swr', () => ({ mutate: vi.fn() }))
vi.mock('sonner', () => ({ toast: { custom: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() } }))

const pointCloudUpload = vi.fn(async () => undefined)
vi.mock('../PointClouds/usePointCloudIntake', () => ({
  usePointCloudIntake: () => ({ upload: pointCloudUpload, convert: vi.fn(), busy: false }),
}))

vi.mock('../../../../ui/uploadFile', () => ({ uploadFile: vi.fn(async () => [{ id: 11 }]) }))
vi.mock('../../../../ui/FilesManager/src/convertIfcToFragmentsFile', () => ({
  convertIfcToFragmentsFile: vi.fn(async (file: File, onProgress?: (p: number) => void) => {
    onProgress?.(0.5)
    return new File([''], file.name.replace(/\.ifc$/, '.frag'))
  }),
}))

const { uploadFile } = await import('../../../../ui/uploadFile')
const { convertIfcToFragmentsFile } = await import('../../../../ui/FilesManager/src/convertIfcToFragmentsFile')

const options = {
  buildingId: 7,
  apiBase: 'https://pc',
  existingNames: [] as string[],
  uploadFile: vi.fn(async () => ({ newFile: { id: 11 } })),
}

describe('useBimFileIntake', () => {
  it('sends a laz to the point cloud pipeline, never to the generic upload', async () => {
    const { result } = renderHook(() => useBimFileIntake(options))
    await act(async () => { await result.current.submit(new File([''], 'scan.laz')) })
    expect(pointCloudUpload).toHaveBeenCalledOnce()
    expect(uploadFile).not.toHaveBeenCalled()
  })

  it('sends an e57 to the point cloud pipeline too', async () => {
    pointCloudUpload.mockClear()
    const { result } = renderHook(() => useBimFileIntake(options))
    await act(async () => { await result.current.submit(new File([''], 'scan.e57')) })
    expect(pointCloudUpload).toHaveBeenCalledOnce()
  })

  it('converts an ifc before uploading it', async () => {
    const { result } = renderHook(() => useBimFileIntake(options))
    await act(async () => { await result.current.submit(new File([''], 'tower.ifc')) })
    expect(convertIfcToFragmentsFile).toHaveBeenCalledOnce()
    expect(uploadFile).toHaveBeenCalled()
  })

  it('does not convert a frag, which is already renderable', async () => {
    vi.mocked(convertIfcToFragmentsFile).mockClear()
    const { result } = renderHook(() => useBimFileIntake(options))
    await act(async () => { await result.current.submit(new File([''], 'tower.frag')) })
    expect(convertIfcToFragmentsFile).not.toHaveBeenCalled()
  })

  it('uploads a document generically', async () => {
    vi.mocked(uploadFile).mockClear()
    const { result } = renderHook(() => useBimFileIntake(options))
    await act(async () => { await result.current.submit(new File([''], 'plan.pdf')) })
    expect(uploadFile).toHaveBeenCalledOnce()
  })

  it('asks for placement only for geometry the user must point at', () => {
    const { result } = renderHook(() => useBimFileIntake(options))
    expect(result.current.needsPlacement(new File([''], 'model.glb'))).toBe(true)
    expect(result.current.needsPlacement(new File([''], 'plan.dxf'))).toBe(true)
    expect(result.current.needsPlacement(new File([''], 'scan.laz'))).toBe(false)
    expect(result.current.needsPlacement(new File([''], 'tower.ifc'))).toBe(false)
    expect(result.current.needsPlacement(new File([''], 'plan.pdf'))).toBe(false)
    expect(result.current.needsPlacement(new File([''], 'photo.png'))).toBe(false)
  })
})
