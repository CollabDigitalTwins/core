// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'

const { uploadFileWithProgressMock } = vi.hoisted(() => ({ uploadFileWithProgressMock: vi.fn() }))

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { organizationId: 3 } } }) }))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), custom: vi.fn(), dismiss: vi.fn() }) }))
vi.mock(
  '../../map/src/tools/AddTools/AddFile/utils/uploadToPresignedURLS',
  () => ({ uploadFileWithProgress: (...args: unknown[]) => uploadFileWithProgressMock(...args) }),
)

import { useFileIntake } from './useFileIntake'

const realFetch = global.fetch

beforeEach(() => {
  uploadFileWithProgressMock.mockReset().mockResolvedValue(undefined)
  vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('uuid-stub' as `${string}-${string}-${string}-${string}-${string}`)
})

afterEach(() => {
  global.fetch = realFetch
  vi.restoreAllMocks()
})

const okUpload = () => {
  global.fetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ presignedUrl: 'http://minio/abc' }) }) as any
}

const bodyOf = (uploadFile: ReturnType<typeof vi.fn>) =>
  (uploadFile.mock.calls[0][0] as { fileData: Record<string, unknown> }).fileData

describe('useFileIntake', () => {
  it('writes geographic columns for a map placement', async () => {
    okUpload()
    const uploadFile = vi.fn().mockResolvedValue({ newFile: { id: 5 } })
    const { result } = renderHook(() => useFileIntake({ existingNames: [], uploadFile, recordType: 'map-file' }))

    await act(async () => {
      await result.current.submit(new File(['x'], 'plan.pdf', { type: 'application/pdf' }), {
        lat: 45.4, lng: -75.7, elevation: 12, rotation: 90,
      })
    })

    expect(bodyOf(uploadFile)).toMatchObject({
      type: 'map-file', name: 'plan.pdf', lat: 45.4, lng: -75.7, elevation: 12, rotation: 90,
    })
  })

  it('leaves a map file unattached to any building', async () => {
    okUpload()
    const uploadFile = vi.fn().mockResolvedValue({ newFile: { id: 5 } })
    const { result } = renderHook(() => useFileIntake({ existingNames: [], uploadFile, recordType: 'map-file' }))

    await act(async () => {
      await result.current.submit(new File(['x'], 'plan.pdf', { type: 'application/pdf' }))
    })

    expect(uploadFile.mock.calls[0][0]).toMatchObject({ buildingId: undefined })
    expect(bodyOf(uploadFile).attachedFilesBuildingId).toBeUndefined()
  })

  it('writes scene columns for a viewer placement', async () => {
    okUpload()
    const uploadFile = vi.fn().mockResolvedValue({ newFile: { id: 5 } })
    const { result } = renderHook(() => useFileIntake({ existingNames: [], uploadFile, buildingId: 9 }))

    await act(async () => {
      await result.current.submit(new File(['x'], 'tower.glb', { type: 'model/gltf-binary' }), {
        x: 1, y: 2, z: 3, scale: 0.5,
      })
    })

    expect(bodyOf(uploadFile)).toMatchObject({ fileTransformX: 1, fileTransformY: 2, fileTransformZ: 3, fileScale: 0.5 })
  })

  it('suffixes a name that is already taken', async () => {
    okUpload()
    const uploadFile = vi.fn().mockResolvedValue({ newFile: { id: 5 } })
    const { result } = renderHook(() => useFileIntake({ existingNames: ['plan.pdf'], uploadFile }))

    await act(async () => {
      await result.current.submit(new File(['x'], 'plan.pdf', { type: 'application/pdf' }))
    })

    expect(bodyOf(uploadFile).name).toBe('plan (1).pdf')
  })

  it('routes a point cloud to the injected converter and uploads nothing itself', async () => {
    const uploadFile = vi.fn()
    const uploadPointCloud = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useFileIntake({ existingNames: [], uploadFile, uploadPointCloud }))

    await act(async () => {
      await result.current.submit(new File(['x'], 'scan.laz', { type: '' }))
    })

    expect(uploadPointCloud).toHaveBeenCalledTimes(1)
    expect(uploadFile).not.toHaveBeenCalled()
  })

  it('reports a failure instead of throwing at the caller', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as any
    const uploadFile = vi.fn()
    const { result } = renderHook(() => useFileIntake({ existingNames: [], uploadFile }))

    let outcome: unknown = 'unset'
    await act(async () => {
      outcome = await result.current.submit(new File(['x'], 'plan.pdf', { type: 'application/pdf' }))
    })

    expect(outcome).toBeNull()
  })

  it('knows which kinds the user places by hand', () => {
    const { result } = renderHook(() => useFileIntake({ existingNames: [], uploadFile: vi.fn() }))

    expect(result.current.needsPlacement(new File([''], 'tower.glb', { type: 'model/gltf-binary' }))).toBe(true)
    expect(result.current.needsPlacement(new File([''], 'notes.pdf', { type: 'application/pdf' }))).toBe(false)
  })
})
