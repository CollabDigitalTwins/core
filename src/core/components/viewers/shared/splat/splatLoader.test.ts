// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSparkEngine } from './splatLoader'

const sparkInstances: FakeSparkRenderer[] = []
const meshInstances: FakeSplatMesh[] = []

class FakeSparkRenderer {
  enable2DGS = false
  preBlurAmount = 0
  blurAmount = 0.3
  dispose = vi.fn()
  constructor(public options: { renderer: unknown, onDirty?: () => void }) {
    sparkInstances.push(this)
  }
}

class FakeSplatMesh {
  initialized: Promise<FakeSplatMesh>
  constructor(public options: { url: string, fileType?: string, onProgress?: (event: ProgressEvent) => void }) {
    meshInstances.push(this)
    this.initialized = Promise.resolve(this)
  }
}

vi.mock('@sparkjsdev/spark', () => ({
  SparkRenderer: FakeSparkRenderer,
  SplatMesh: FakeSplatMesh,
}))

const fakeScene = () => ({ add: vi.fn(), remove: vi.fn() })
const attachment = (scene: ReturnType<typeof fakeScene>, onDirty?: () => void) =>
  ({ renderer: {}, scene, onDirty }) as unknown as Parameters<ReturnType<typeof createSparkEngine>['attach']>[0]

beforeEach(() => {
  sparkInstances.length = 0
  meshInstances.length = 0
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

    expect(engine.settings()).toEqual({ enable2DGS: true, preBlurAmount: 0, blurAmount: 0.3 })
  })

  it('writes a falsy value rather than skipping it', async () => {
    const engine = createSparkEngine()
    await engine.attach(attachment(fakeScene()))

    engine.configure({ blurAmount: 0 })

    expect(engine.settings()?.blurAmount).toBe(0)
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
