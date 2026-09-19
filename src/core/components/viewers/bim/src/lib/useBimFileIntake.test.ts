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

  it('routes a splat through user placement, like a model', () => {
    const { result } = renderHook(() => useBimFileIntake(options))
    expect(result.current.needsPlacement(new File([''], 'scan.spz'))).toBe(true)
    expect(result.current.needsPlacement(new File([''], 'scan.ply'))).toBe(true)
  })

  it('persists a placed splat into pointCloudTransform, not x/y/z', async () => {
    vi.mocked(uploadFile).mockClear()
    const { result } = renderHook(() => useBimFileIntake(options))
    await act(async () => {
      await result.current.submit(new File([''], 'scan.spz'), { x: 1, y: 2, z: 3 } as never)
    })
    const sent = vi.mocked(uploadFile).mock.calls[0][0] as { pointCloudTransform?: { position?: number[] } }
    expect(sent.pointCloudTransform?.position).toEqual([1, 2, 3])
  })

  it('leaves pointCloudTransform unset for a model, which uses x/y/z', async () => {
    vi.mocked(uploadFile).mockClear()
    const { result } = renderHook(() => useBimFileIntake(options))
    await act(async () => {
      await result.current.submit(new File([''], 'model.glb'), { x: 1, y: 2, z: 3 } as never)
    })
    const sent = vi.mocked(uploadFile).mock.calls[0][0] as { pointCloudTransform?: unknown, x?: number }
    expect(sent.pointCloudTransform).toBeUndefined()
    expect(sent.x).toBe(1)
  })

  it('saves a model placed at a scale into the scale column', async () => {
    vi.mocked(uploadFile).mockClear()
    const { result } = renderHook(() => useBimFileIntake(options))
    await act(async () => {
      await result.current.submit(new File([''], 'model.glb'), { x: 1, y: 2, z: 3 } as never, 2.5)
    })
    expect((vi.mocked(uploadFile).mock.calls[0][0] as { scale?: number }).scale).toBe(2.5)
  })

  it('saves a drawing placed at its millimetre scale', async () => {
    vi.mocked(uploadFile).mockClear()
    const { result } = renderHook(() => useBimFileIntake(options))
    await act(async () => {
      await result.current.submit(new File([''], 'level-2.dxf'), { x: 0, y: 0, z: 0 } as never, 0.001)
    })
    expect((vi.mocked(uploadFile).mock.calls[0][0] as { scale?: number }).scale).toBe(0.001)
  })

  it('keeps a splat scale inside its transform, leaving the column null', async () => {
    vi.mocked(uploadFile).mockClear()
    const { result } = renderHook(() => useBimFileIntake(options))
    await act(async () => {
      await result.current.submit(new File([''], 'scan.spz'), { x: 1, y: 2, z: 3 } as never, 4)
    })
    const sent = vi.mocked(uploadFile).mock.calls[0][0] as {
      scale?: number
      pointCloudTransform?: { scale?: number }
    }
    expect(sent.scale).toBeUndefined()
    expect(sent.pointCloudTransform?.scale).toBe(4)
  })
})
