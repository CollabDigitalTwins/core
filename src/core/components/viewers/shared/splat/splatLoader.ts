// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { SparkRenderer, SplatMesh } from '@sparkjsdev/spark'
import type * as THREE from 'three'

/** Renderer-wide splat drawing knobs. They live on the one shared `SparkRenderer`. */
export interface SplatRenderSettings {
  enable2DGS: boolean
  preBlurAmount: number
  blurAmount: number
}

export interface SplatAttachment {
  renderer: THREE.WebGLRenderer
  scene: THREE.Object3D
  /** Spark sorts a frame behind, so it asks for the redraw that shows the new order. */
  onDirty?: () => void
}

export interface SplatLoadOptions {
  onProgress?: (percent: number) => void
}

export interface SplatEngine {
  attach(attachment: SplatAttachment): Promise<void>
  load(url: string, options?: SplatLoadOptions): Promise<SplatMesh>
  configure(patch: Partial<SplatRenderSettings>): void
  settings(): SplatRenderSettings | null
  /** Every splat draws through this one material, which is what a render pass excludes. */
  material(): THREE.Material | null
  dispose(): void
}

const percentOf = (event: ProgressEvent): number =>
  event.lengthComputable && event.total > 0
    ? Math.round((event.loaded / event.total) * 100)
    : 0

/**
 * Spark behind the framework-free `SplatEngine` port. The only module in the
 * codebase that imports it, so every other layer stays testable without WebGL.
 */
export function createSparkEngine(): SplatEngine {
  let spark: SparkRenderer | null = null
  let host: THREE.Object3D | null = null
  let module: typeof import('@sparkjsdev/spark') | null = null

  const sparkModule = async () => (module ??= await import('@sparkjsdev/spark'))

  return {
    async attach({ renderer, scene, onDirty }) {
      if (spark) return
      const { SparkRenderer } = await sparkModule()
      spark = new SparkRenderer({ renderer, onDirty })
      host = scene
      scene.add(spark)
    },

    async load(url, { onProgress } = {}) {
      const { SplatMesh } = await sparkModule()
      const mesh = new SplatMesh({
        url,
        onProgress: event => onProgress?.(percentOf(event)),
      })
      await mesh.initialized
      return mesh
    },

    configure(patch) {
      if (!spark) return
      if (patch.enable2DGS !== undefined) spark.enable2DGS = patch.enable2DGS
      if (patch.preBlurAmount !== undefined) spark.preBlurAmount = patch.preBlurAmount
      if (patch.blurAmount !== undefined) spark.blurAmount = patch.blurAmount
    },

    settings() {
      if (!spark) return null
      const { enable2DGS, preBlurAmount, blurAmount } = spark
      return { enable2DGS, preBlurAmount, blurAmount }
    },

    material() {
      return spark?.material ?? null
    },

    dispose() {
      if (spark) {
        host?.remove(spark)
        spark.dispose()
      }
      spark = null
      host = null
      module = null
    },
  }
}
