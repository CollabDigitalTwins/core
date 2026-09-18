// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'


import { createSparkEngine } from './splatLoader'

const sparkInstances: FakeSparkRenderer[] = []
const meshInstances: FakeSplatMesh[] = []
const editInstances: FakeSplatEdit[] = []

class FakeSparkRenderer {
  enable2DGS = false
  preBlurAmount = 0
  blurAmount = 0.3
  lodSplatCount: number | undefined = undefined
  defaultSplatTarget = () => 2_500_000
  dispose = vi.fn()
  constructor(public options: { renderer: unknown, onDirty?: () => void }) {
    sparkInstances.push(this)
  }
}

class FakeSplatMesh {
  initialized: Promise<FakeSplatMesh>
  constructor(public options: { url: string, fileType?: string, editable?: boolean, lod?: boolean, onProgress?: (event: ProgressEvent) => void }) {
    meshInstances.push(this)
    this.initialized = Promise.resolve(this)
  }
}

class FakeSplatEdit {
  sdfs: unknown[] | null
  children: unknown[] = []
  constructor(public options: { sdfs?: unknown[] }) {
    this.sdfs = options.sdfs ?? null
    editInstances.push(this)
  }

  add(child: unknown) { this.children.push(child) }
}

class FakeSplatEditSdf {
  position = new THREE.Vector3()
  quaternion = new THREE.Quaternion()
  updateMatrixWorld = vi.fn()
  removeFromParent = vi.fn()
  constructor(public options: { type: string, opacity: number }) {}
}

vi.mock('@sparkjsdev/spark', () => ({
  SparkRenderer: FakeSparkRenderer,
  SplatMesh: FakeSplatMesh,
  SplatEdit: FakeSplatEdit,
  SplatEditSdf: FakeSplatEditSdf,
  SplatEditSdfType: { PLANE: 'plane' },
}))

const fakeScene = () => ({ add: vi.fn(), remove: vi.fn() })
const attachment = (scene: ReturnType<typeof fakeScene>, onDirty?: () => void) =>
  ({ renderer: {}, scene, onDirty }) as unknown as Parameters<ReturnType<typeof createSparkEngine>['attach']>[0]

beforeEach(() => {
  sparkInstances.length = 0
  meshInstances.length = 0
  editInstances.length = 0
})

describe('attach', () => {
  it('adds one SparkRenderer to the scene and passes the redraw hook through', async () => {
    const scene = fakeScene()
    const onDirty = vi.fn()
    const engine = createSparkEngine()

    await engine.attach(attachment(scene, onDirty))

    expect(sparkInstances).toHaveLength(1)
    expect(scene.add).toHaveBeenCalledWith(sparkInstances[0])
    expect(sparkInstances[0].options.onDirty).toBe(onDirty)
  })

  it('never builds a second renderer', async () => {
    const scene = fakeScene()
    const engine = createSparkEngine()

    await engine.attach(attachment(scene))
    await engine.attach(attachment(scene))

    expect(sparkInstances).toHaveLength(1)
    expect(scene.add).toHaveBeenCalledTimes(1)
  })
})

describe('load', () => {
  it('resolves only once the mesh reports initialized', async () => {
    const engine = createSparkEngine()
    await engine.attach(attachment(fakeScene()))

    const mesh = await engine.load('https://example.test/capture.spz')

    expect(mesh).toBe(meshInstances[0])
    expect(meshInstances[0].options.url).toBe('https://example.test/capture.spz')
  })

  it('creates the mesh editable, or Spark ignores the SplatEdit that clips it', async () => {
    const engine = createSparkEngine()
    await engine.attach(attachment(fakeScene()))

    await engine.load('https://example.test/capture.spz')

    expect(meshInstances[0].options.editable).toBe(true)
  })

  it('opts the mesh into lod, which the renderer enables but the mesh never joins', async () => {
    const engine = createSparkEngine()
    await engine.attach(attachment(fakeScene()))

    await engine.load('https://example.test/capture.spz')

    expect(meshInstances[0].options.lod).toBe(true)
  })

  it('names the decoder so Spark never has to guess from a presigned URL', async () => {
    const engine = createSparkEngine()
    await engine.attach(attachment(fakeScene()))

    await engine.load('https://minio.test/bucket/9f2a-uuid?X-Amz-Signature=abc', { fileType: 'pcsogszip' })

    expect(meshInstances[0].options.fileType).toBe('pcsogszip')
  })

  it('omits the key entirely when the type is unknown, leaving Spark to sniff', async () => {
    const engine = createSparkEngine()
    await engine.attach(attachment(fakeScene()))

    await engine.load('https://minio.test/bucket/9f2a-uuid')

    expect(meshInstances[0].options).not.toHaveProperty('fileType')
  })

  it('reports progress as a whole percentage', async () => {
    const engine = createSparkEngine()
    await engine.attach(attachment(fakeScene()))
    const onProgress = vi.fn()

    await engine.load('https://example.test/capture.spz', { onProgress })
    meshInstances[0].options.onProgress?.(
      { lengthComputable: true, loaded: 25, total: 200 } as ProgressEvent,
    )

    expect(onProgress).toHaveBeenCalledWith(13)
  })

  it('reports zero rather than NaN when the length is unknown', async () => {
    const engine = createSparkEngine()
    await engine.attach(attachment(fakeScene()))
    const onProgress = vi.fn()

    await engine.load('https://example.test/capture.ply', { onProgress })
    meshInstances[0].options.onProgress?.(
      { lengthComputable: false, loaded: 25, total: 0 } as ProgressEvent,
    )

    expect(onProgress).toHaveBeenCalledWith(0)
  })
})

describe('configure', () => {
  it('writes only the keys it is given', async () => {
    const engine = createSparkEngine()
    await engine.attach(attachment(fakeScene()))

    engine.configure({ enable2DGS: true })

    expect(engine.settings()).toEqual({ enable2DGS: true, preBlurAmount: 0, blurAmount: 0.3, lodSplatCount: 2_500_000 })
  })

  it('writes a falsy value rather than skipping it', async () => {
    const engine = createSparkEngine()
    await engine.attach(attachment(fakeScene()))

    engine.configure({ blurAmount: 0 })

    expect(engine.settings()?.blurAmount).toBe(0)
  })

  it('drives the lod budget live, so the slider needs no re-attach', async () => {
    const engine = createSparkEngine()
    await engine.attach(attachment(fakeScene()))

    engine.configure({ lodSplatCount: 1_200_000 })

    expect(sparkInstances[0].lodSplatCount).toBe(1_200_000)
    expect(engine.settings()?.lodSplatCount).toBe(1_200_000)
  })

  it('leaves the budget unset so Spark keeps its own per-device default', async () => {
    const engine = createSparkEngine()
    await engine.attach(attachment(fakeScene()))

    engine.configure({ enable2DGS: true })

    expect(sparkInstances[0].lodSplatCount).toBeUndefined()
    expect(engine.settings()?.lodSplatCount).toBe(2_500_000)
  })

  it('is inert before attach', () => {
    const engine = createSparkEngine()

    expect(() => engine.configure({ enable2DGS: true })).not.toThrow()
    expect(engine.settings()).toBeNull()
  })
})

describe('dispose', () => {
  it('takes the renderer out of the scene and frees it', async () => {
    const scene = fakeScene()
    const engine = createSparkEngine()
    await engine.attach(attachment(scene))
    const spark = sparkInstances[0]

    engine.dispose()

    expect(scene.remove).toHaveBeenCalledWith(spark)
    expect(spark.dispose).toHaveBeenCalledTimes(1)
    expect(engine.settings()).toBeNull()
  })

  it('can attach again afterwards', async () => {
    const scene = fakeScene()
    const engine = createSparkEngine()
    await engine.attach(attachment(scene))
    engine.dispose()

    await engine.attach(attachment(scene))

    expect(sparkInstances).toHaveLength(2)
  })
})

describe('setClippingPlanes', () => {
  const flush = () => new Promise(resolve => setTimeout(resolve, 0))
  const planeAt = (y: number) => new THREE.Plane(new THREE.Vector3(0, 1, 0), -y)

  it('adds one global edit to the scene, outside any SplatMesh, so every splat is cut', async () => {
    const engine = createSparkEngine()
    const scene = fakeScene()
    await engine.attach(attachment(scene))

    engine.setClippingPlanes([planeAt(1)])
    await flush()

    expect(editInstances).toHaveLength(1)
    expect(scene.add).toHaveBeenCalledWith(editInstances[0])
  })

  it('gives the edit one sdf per plane and reuses the edit as planes change', async () => {
    const engine = createSparkEngine()
    await engine.attach(attachment(fakeScene()))

    engine.setClippingPlanes([planeAt(1), planeAt(2)])
    await flush()
    engine.setClippingPlanes([planeAt(3)])
    await flush()

    expect(editInstances).toHaveLength(1)
    expect(editInstances[0].sdfs).toHaveLength(1)
  })

  it('remembers planes set before attach, so a splat opened into a clipped scene still cuts', async () => {
    const engine = createSparkEngine()

    engine.setClippingPlanes([planeAt(1)])
    await engine.attach(attachment(fakeScene()))
    await flush()

    expect(editInstances[0].sdfs).toHaveLength(1)
  })
})

describe('setClippingPlanes reconciliation', () => {
  const flush = () => new Promise(resolve => setTimeout(resolve, 0))
  const planeAt = (y: number) => new THREE.Plane(new THREE.Vector3(0, 1, 0), -y)

  it('ignores a repeat call with unchanged planes, so a per-frame sync is free', async () => {
    const engine = createSparkEngine()
    await engine.attach(attachment(fakeScene()))
    const planes = [planeAt(1)]

    engine.setClippingPlanes(planes)
    await flush()
    const sdf = editInstances[0].sdfs![0] as { updateMatrixWorld: ReturnType<typeof vi.fn> }
    const callsAfterFirst = sdf.updateMatrixWorld.mock.calls.length

    engine.setClippingPlanes(planes)
    await flush()

    expect(sdf.updateMatrixWorld.mock.calls.length).toBe(callsAfterFirst)
  })

  // OBC drags a plane by mutating it in place and fires no event, so the same array must re-sync.
  it('follows a plane dragged in place, even though the array is the same object', async () => {
    const engine = createSparkEngine()
    await engine.attach(attachment(fakeScene()))
    const planes = [planeAt(1)]

    engine.setClippingPlanes(planes)
    await flush()

    planes[0].constant = -6
    engine.setClippingPlanes(planes)
    await flush()

    const sdf = editInstances[0].sdfs![0] as { position: THREE.Vector3 }
    expect(sdf.position.y).toBeCloseTo(6)
  })

  it('follows a plane rotated in place, not just moved', async () => {
    const engine = createSparkEngine()
    await engine.attach(attachment(fakeScene()))
    const planes = [planeAt(0)]

    engine.setClippingPlanes(planes)
    await flush()

    planes[0].normal.set(1, 0, 0)
    engine.setClippingPlanes(planes)
    await flush()

    const sdf = editInstances[0].sdfs![0] as { quaternion: THREE.Quaternion }
    expect(new THREE.Vector3(0, 0, 1).applyQuaternion(sdf.quaternion).x).toBeCloseTo(1)
  })

  it('drops the sdfs when the last plane is deleted', async () => {
    const engine = createSparkEngine()
    await engine.attach(attachment(fakeScene()))

    engine.setClippingPlanes([planeAt(1)])
    await flush()
    engine.setClippingPlanes([])
    await flush()

    expect(editInstances[0].sdfs).toHaveLength(0)
  })
})
