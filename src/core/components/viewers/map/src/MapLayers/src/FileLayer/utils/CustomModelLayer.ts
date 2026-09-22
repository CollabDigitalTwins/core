// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { type CustomLayerInterface, type LngLatLike, type Map } from 'maplibre-gl'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { applyAnimationTo, initialState, withClip, withPlaying, withSpeed } from '../../../../../../shared/placement/modelAnimation'
import { hitTestLayerScene } from '../../../../../utils/layerRaycast'
import { writeModelMatrix } from '../../../../../utils/modelMatrix'
import { disposeThreeScene } from '../../disposeThreeScene'

import type { DbFile } from '../../../../../../../../types/dbTypes'
import type { AnimationState } from '../../../../../../shared/placement/modelAnimation'

type TempPositionsRef = React.MutableRefObject<Record<string, { lat: number; lng: number }>>
type TempRotationsRef = React.MutableRefObject<Record<string, number>>
type TempElevationsRef = React.MutableRefObject<Record<string, number>>
type TempScalesRef = React.MutableRefObject<Record<string, number>>
type EditingFileIdRef = React.MutableRefObject<string | null>

function resolveModelCoordinates(file: DbFile): { lng: number, lat: number } {
  if (typeof file.lng === 'number' && typeof file.lat === 'number') {
    return { lng: file.lng, lat: file.lat }
  }

  const rawPosition = file.position as unknown
  if (rawPosition && typeof rawPosition === 'object') {
    const pos = rawPosition as { lng?: number, lat?: number }
    if (typeof pos.lng === 'number' && typeof pos.lat === 'number') {
      return { lng: pos.lng, lat: pos.lat }
    }
  }

  if (typeof rawPosition === 'string') {
    try {
      const parsed = JSON.parse(rawPosition) as { lng?: number, lat?: number }
      if (typeof parsed.lng === 'number' && typeof parsed.lat === 'number') {
        return { lng: parsed.lng, lat: parsed.lat }
      }
    }
    catch {
      // Ignore malformed legacy position payloads.
    }
  }

  return { lng: 0, lat: 0 }
}

/** Playback for a loaded model's clips, so the map's animation card drives the same state the BIM one does. */
export interface ModelAnimationControls {
  getClips(): string[]
  getAnimation(): AnimationState | null
  setClip(clipIndex: number): void
  setPlaying(playing: boolean): void
  setSpeed(speed: number): void
}

export interface ModelLayerHandle {
  cleanup: () => void
  remove: () => void
  hitTest: (ndcX: number, ndcY: number) => boolean
  animation: ModelAnimationControls
}

export const CustomModelLayer = (
  modelFile: DbFile,
  map: Map,
  renderer: THREE.WebGLRenderer,
  tempPositionsRef?: TempPositionsRef,
  editingFileIdRef?: EditingFileIdRef,
  tempRotationsRef?: TempRotationsRef,
  tempElevationsRef?: TempElevationsRef,
  tempScalesRef?: TempScalesRef,
): ModelLayerHandle => {
  let components = null
  let customLayer: CustomLayerInterface | null = null
  let clips: THREE.AnimationClip[] = []
  let animation: AnimationState | null = null
  let mixerRef: THREE.AnimationMixer | null = null

  const noControls: ModelAnimationControls = {
    getClips: () => [],
    getAnimation: () => null,
    setClip: () => {},
    setPlaying: () => {},
    setSpeed: () => {},
  }

  if (!map || !modelFile) {
    return { cleanup: () => {}, remove: () => {}, hitTest: () => false, animation: noControls }
  }

  const modelFileKey = String(modelFile.id)

  // Refs into the layer's camera and scene so raycasting can read the last
  // rendered frame's transform without entering the render loop.
  let cameraRef: THREE.Camera | null = null
  let sceneRef: THREE.Scene | null = null


  const createCustomLayer = (): CustomLayerInterface => {
    // Track last applied rotation so we can apply delta increments (same as BimLayer)
    let lastAppliedRotation = modelFile.rotation ?? 0
    // Layer-removed-mid-load guard + reused per-frame matrices
    let disposed = false
    const _m = new THREE.Matrix4()
    const _l = new THREE.Matrix4()
    const _scaleVec = new THREE.Vector3()
    // Render-on-demand: cache terrain elevation off the per-frame path and only
    // keep repainting while the camera recently moved or an animation is playing,
    // so an idle map with a placed model stops re-rendering instead of pinning the
    // main thread (this was the freeze after a flyTo to high zoom).
    let cachedTerrainElev = 0
    let lastMoveTime = performance.now()
    const SETTLE_MS = 1000
    let onMapMove: (() => void) | undefined
    let onMapMoveEnd: (() => void) | undefined
    const recomputeTerrainElev = () => {
      const { lng, lat } = resolveModelCoordinates(modelFile)
      if (!(lng === 0 && lat === 0)) {
        const e = map.queryTerrainElevation([lng, lat])
        if (e !== null && e !== undefined) cachedTerrainElev = e
      }
    }

    return {
      id: `model-${modelFile.id}`,
      type: 'custom',
      renderingMode: '3d',
      onAdd(map, gl) {
        this.camera = new THREE.Camera()
        this.scene = new THREE.Scene()
        this.renderer = renderer

        // Expose to closure for raycasting
        cameraRef = this.camera as THREE.Camera
        sceneRef = this.scene as THREE.Scene

        const scene = this.scene as THREE.Scene

        // Apply initial rotation
        if (lastAppliedRotation !== 0) {
          scene.rotateY(lastAppliedRotation * (Math.PI / 180))
        }

        // Lighting to match OBC library setup
        scene.background = null
        scene.fog = new THREE.Fog(0x20_29_32, 10, 200)
        scene.add(new THREE.AmbientLight(0xFF_FF_FF, 1))
        scene.add(new THREE.HemisphereLight(0xFF_FF_BB, 0x08_08_20, 0.5))

        const sun = new THREE.DirectionalLight(0xFF_FF_FF, 1.5)
        sun.position.set(0, -70, 100).normalize()
        sun.castShadow = true
        sun.shadow.mapSize.set(2048, 2048)
        scene.add(sun)

        const fill = new THREE.DirectionalLight(0xFF_FF_FF, 1)
        fill.position.set(0, 70, 100).normalize()
        scene.add(fill)

        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        this.renderer.autoClear = false
        this.clock = new THREE.Clock()

        const loader = new GLTFLoader()
        loader.load(
          modelFile.url!,
          (gltf) => {
            // Layer was removed before the async load resolved — don't attach to a
            // dead scene; let the gltf be GC'd (no GPU upload happened yet).
            if (disposed) return
            gltf.scene.scale.setScalar(1)

            clips = gltf.animations ?? []
            animation = initialState(clips.length)
            if (animation) {
              this.mixer = new THREE.AnimationMixer(gltf.scene)
              mixerRef = this.mixer
              applyAnimationTo(this.mixer, clips, animation)
            }

            scene.add(gltf.scene)
            // Open the settle window so the just-loaded model paints, then idle.
            lastMoveTime = performance.now()
            recomputeTerrainElev()
            map.triggerRepaint()
          },
          undefined,
          (error) => { console.error('Error loading model:', error) },
        )

        // Track camera movement for render-on-demand: keep repainting only
        // during/just-after movement; refresh cached terrain elevation on settle.
        onMapMove = () => { lastMoveTime = performance.now() }
        onMapMoveEnd = () => {
          lastMoveTime = performance.now()
          recomputeTerrainElev()
          map.triggerRepaint()
        }
        map.on('move', onMapMove)
        map.on('moveend', onMapMoveEnd)
      },

      render(gl, args) {
        if (map.getZoom() < 15.5) return

        const isEditing = editingFileIdRef?.current === modelFileKey

        // ── Position ──────────────────────────────────────────────────────────
        let lng: number
        let lat: number
        if (isEditing && tempPositionsRef?.current[modelFileKey]) {
          const tp = tempPositionsRef.current[modelFileKey]
          lng = tp.lng
          lat = tp.lat
        } else {
          const coords = resolveModelCoordinates(modelFile)
          lng = coords.lng
          lat = coords.lat
        }

        if (lng === 0 && lat === 0) return

        // ── Rotation (delta-increment, same pattern as BimLayer) ──────────────
        const targetRotation = (isEditing && tempRotationsRef?.current[modelFileKey] !== undefined)
          ? tempRotationsRef.current[modelFileKey]
          : (modelFile.rotation ?? 0)

        if (targetRotation !== lastAppliedRotation) {
          ;(this.scene as THREE.Scene).rotateY(
            (targetRotation - lastAppliedRotation) * (Math.PI / 180)
          )
          lastAppliedRotation = targetRotation
        }

        // ── Elevation ─────────────────────────────────────────────────────────
        const fileElevation = (isEditing && tempElevationsRef?.current[modelFileKey] !== undefined)
          ? tempElevationsRef.current[modelFileKey]
          : (modelFile.elevation ?? 0)

        const modelOrigin = [lng, lat] as LngLatLike
        // Cached terrain elevation (refreshed on moveend); query live only while
        // editing this model's position. Keeps queryTerrainElevation off the hot
        // path — the per-frame query drove the high-zoom freeze.
        const terrainAltitude = isEditing
          ? (map.queryTerrainElevation([lng, lat]) ?? cachedTerrainElev)
          : cachedTerrainElev
        const altitude = terrainAltitude + fileElevation

        const fileScale = (isEditing && tempScalesRef?.current[modelFileKey] !== undefined)
          ? tempScalesRef.current[modelFileKey]
          : (modelFile.scale ?? 1)

        _m.fromArray(args.defaultProjectionData.mainMatrix)
        writeModelMatrix(_l, modelOrigin, altitude).scale(_scaleVec.setScalar(fileScale))
        this.camera.projectionMatrix.multiplyMatrices(_m, _l)

        if (this.mixer) {
          this.mixer.update((this.clock as THREE.Clock).getDelta())
        }

        this.renderer.resetState()
        this.renderer.render(this.scene, this.camera)

        // Render-on-demand: keep the frame loop alive only while an animation is
        // playing, the camera recently moved (settle window), or this model is
        // being edited. Idle static model ⇒ no self-scheduled repaints ⇒ no freeze.
        if (animation?.playing || isEditing || performance.now() - lastMoveTime < SETTLE_MS) {
          map.triggerRepaint()
        }
      },

      onRemove() {
        disposed = true
        if (onMapMove) map.off('move', onMapMove)
        if (onMapMoveEnd) map.off('moveend', onMapMoveEnd)
        // Stop + release the animation mixer so it isn't left running/holding the
        // scene after removal.
        if (this.mixer) {
          ;(this.mixer as THREE.AnimationMixer).stopAllAction()
          this.mixer = null
        }
        mixerRef = null
        clips = []
        animation = null
        if (this.scene) disposeThreeScene(this.scene as THREE.Scene)
        cameraRef = null
        sceneRef = null
        this.renderer = null
        this.camera = null
        this.scene = null
      },
    }
  }

  const hitTest = (ndcX: number, ndcY: number): boolean => hitTestLayerScene(cameraRef, sceneRef, ndcX, ndcY)

  customLayer = createCustomLayer()

  if (!map.getLayer(customLayer.id)) {
    map.addLayer(customLayer)
  }

  const removeLayer = () => {
    if (customLayer && map.getLayer(customLayer.id)) {
      map.removeLayer(customLayer.id)
    }
  }

  const cleanup = () => {
    removeLayer()
    components = null
    customLayer = null
  }

  const commit = (next: AnimationState | null) => {
    if (!next || !mixerRef) return
    animation = next
    applyAnimationTo(mixerRef, clips, next)
    map.triggerRepaint()
  }

  const controls: ModelAnimationControls = {
    getClips: () => clips.map((clip, index) => clip.name || `Clip ${index + 1}`),
    getAnimation: () => animation,
    setClip: clipIndex => commit(animation && withClip(animation, clipIndex, clips.length)),
    setPlaying: playing => commit(animation && withPlaying(animation, playing)),
    setSpeed: speed => commit(animation && withSpeed(animation, speed)),
  }

  return { cleanup, remove: removeLayer, hitTest, animation: controls }
}
