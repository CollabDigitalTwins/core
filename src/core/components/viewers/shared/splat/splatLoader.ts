// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { syncClipSdfs } from './splatClipping'

import type { ClipEdit, ClipSdf } from './splatClipping'

import type { SplatFileType } from './splatFiles'
import type { SparkRenderer, SplatFileType as SparkFileType, SplatMesh } from '@sparkjsdev/spark'
import type * as THREE from 'three'

/** Renderer-wide splat drawing knobs. They live on the one shared `SparkRenderer`. */
export interface SplatRenderSettings {
  enable2DGS: boolean
  preBlurAmount: number
  blurAmount: number
  /** Reported as the budget in force: Spark's own per-device target until something overrides it. */
  lodSplatCount?: number
}

export interface SplatAttachment {
  renderer: THREE.WebGLRenderer
  scene: THREE.Object3D
  /** Spark sorts a frame behind, so it asks for the redraw that shows the new order. */
  onDirty?: () => void
}

export interface SplatLoadOptions {
  onProgress?: (percent: number) => void
  fileType?: SplatFileType
}

export interface SplatEngine {
  attach(attachment: SplatAttachment): Promise<void>
  load(url: string, options?: SplatLoadOptions): Promise<SplatMesh>
  configure(patch: Partial<SplatRenderSettings>): void
  settings(): SplatRenderSettings | null
  /** Cuts every splat, loaded or not, with the scene's clipping planes. */
  setClippingPlanes(planes: readonly THREE.Plane[]): void
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
  let clipEdit: InstanceType<typeof import('@sparkjsdev/spark').SplatEdit> | null = null
  let clipPlanes: readonly THREE.Plane[] = []
  let appliedClip: string | null = null

  const sparkModule = async () => (module ??= await import('@sparkjsdev/spark'))

  // Spark collects an edit by `instanceof`, so it must come from this module's own copy.
  const applyClipping = () => {
    // Spark sizes its edit buffers on the first frame that has any edit, so an unclipped scene gets none.
    if (!host || (!clipEdit && clipPlanes.length === 0)) return
    void sparkModule().then(({ SplatEdit, SplatEditSdf, SplatEditSdfType }) => {
      if (!host) return
      if (!clipEdit) {
        clipEdit = new SplatEdit({ sdfs: [] })
        host.add(clipEdit)
      }
      // Spark's classes extend THREE.Object3D, and three ships no types, so the base is `any`.
      syncClipSdfs(
        clipEdit as unknown as ClipEdit,
        clipPlanes,
        () => new SplatEditSdf({ type: SplatEditSdfType.PLANE, opacity: 0 }) as unknown as ClipSdf,
      )
    }).catch((error: unknown) => {
      appliedClip = null
      console.error('Splat clipping could not be applied:', error)
    })
  }

  return {
    async attach({ renderer, scene, onDirty }) {
      if (spark) return
      const { SparkRenderer } = await sparkModule()
      spark = new SparkRenderer({ renderer, onDirty })
      host = scene
      scene.add(spark)
      applyClipping()
    },

    async load(url, { onProgress, fileType } = {}) {
      const { SplatMesh } = await sparkModule()
      const mesh = new SplatMesh({
        url,
        ...(fileType ? { fileType: fileType as SparkFileType } : {}),
        // Without this Spark ignores every SplatEdit, so the clipping planes never cut the splat.
        editable: true,
        // SparkRenderer enables lod already; the mesh is what never builds a tree to traverse.
        lod: true,
        onProgress: event => onProgress?.(percentOf(event)),
      })
      await mesh.initialized
      return mesh
    },

    setClippingPlanes(planes) {
      // OBC drags a plane by mutating it in place, so only the values can say whether it moved.
      const signature = planes.map(p => `${p.normal.x},${p.normal.y},${p.normal.z},${p.constant}`).join('|')
      if (signature === appliedClip) return
      appliedClip = signature
      clipPlanes = planes
      applyClipping()
    },

    configure(patch) {
      if (!spark) return
      if (patch.enable2DGS !== undefined) spark.enable2DGS = patch.enable2DGS
      if (patch.preBlurAmount !== undefined) spark.preBlurAmount = patch.preBlurAmount
      if (patch.blurAmount !== undefined) spark.blurAmount = patch.blurAmount
      if (patch.lodSplatCount !== undefined) spark.lodSplatCount = patch.lodSplatCount
    },

    settings() {
      if (!spark) return null
      const { enable2DGS, preBlurAmount, blurAmount, lodSplatCount } = spark
      return { enable2DGS, preBlurAmount, blurAmount, lodSplatCount: lodSplatCount ?? spark.defaultSplatTarget() }
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
