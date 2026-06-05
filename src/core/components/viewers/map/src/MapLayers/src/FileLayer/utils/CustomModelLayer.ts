import { type CustomLayerInterface, type LngLatLike, type Map } from 'maplibre-gl'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DbFile } from '../../../../../../../../types/dbTypes'
import { disposeThreeScene } from '../../disposeThreeScene'

type TempPositionsRef = React.MutableRefObject<Record<string, { lat: number; lng: number }>>
type TempRotationsRef = React.MutableRefObject<Record<string, number>>
type TempElevationsRef = React.MutableRefObject<Record<string, number>>
type EditingFileNameRef = React.MutableRefObject<string | null>

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

export const CustomModelLayer = (
  modelFile: DbFile,
  map: Map,
  renderer: THREE.WebGLRenderer,
  tempPositionsRef?: TempPositionsRef,
  editingFileNameRef?: EditingFileNameRef,
  tempRotationsRef?: TempRotationsRef,
  tempElevationsRef?: TempElevationsRef,
): { cleanup: () => void, remove: () => void, hitTest: (ndcX: number, ndcY: number) => boolean } => {
  let components = null
  let customLayer: CustomLayerInterface | null = null

  if (!map || !modelFile) {
    return { cleanup: () => {}, remove: () => {}, hitTest: () => false }
  }

  // Refs into the layer's camera and scene so raycasting can read the last
  // rendered frame's transform without entering the render loop.
  let cameraRef: THREE.Camera | null = null
  let sceneRef: THREE.Scene | null = null

  // Reused temps for hitTest raycasting — avoid per-call allocation (audit B3).
  const _hitInv = new THREE.Matrix4()
  const _hitNear = new THREE.Vector3()
  const _hitFar = new THREE.Vector3()
  const _hitDir = new THREE.Vector3()
  const _raycaster = new THREE.Raycaster()

  const createCustomLayer = (): CustomLayerInterface => {
    // Track last applied rotation so we can apply delta increments (same as BimLayer)
    let lastAppliedRotation = modelFile.rotation ?? 0
    // Layer-removed-mid-load guard (audit B4) + reused per-frame matrices (audit B2)
    let disposed = false
    const _m = new THREE.Matrix4()
    const _l = new THREE.Matrix4()
    // Render-on-demand (audit C1/C2): cache terrain elevation off the per-frame
    // path and only keep repainting while the camera recently moved or an
    // animation is playing, so an idle map with a placed model stops re-rendering
    // instead of pinning the main thread (the freeze after a flyTo to high zoom).
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
            // dead scene; let the gltf be GC'd (no GPU upload happened yet). (audit B4)
            if (disposed) return
            gltf.scene.scale.setScalar(1)

            if (gltf.animations && gltf.animations.length > 0) {
              this.mixer = new THREE.AnimationMixer(gltf.scene)
              for (const clip of gltf.animations) {
                this.mixer!.clipAction(clip).play()
              }
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

        // Track camera movement for render-on-demand (C2): keep repainting only
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

        const isEditing = editingFileNameRef?.current === modelFile.name

        // ── Position ──────────────────────────────────────────────────────────
        let lng: number
        let lat: number
        if (isEditing && tempPositionsRef?.current[modelFile.name]) {
          const tp = tempPositionsRef.current[modelFile.name]
          lng = tp.lng
          lat = tp.lat
        } else {
          const coords = resolveModelCoordinates(modelFile)
          lng = coords.lng
          lat = coords.lat
        }

        if (lng === 0 && lat === 0) return

        // ── Rotation (delta-increment, same pattern as BimLayer) ──────────────
        const targetRotation = (isEditing && tempRotationsRef?.current[modelFile.name] !== undefined)
          ? tempRotationsRef.current[modelFile.name]
          : (modelFile.rotation ?? 0)

        if (targetRotation !== lastAppliedRotation) {
          ;(this.scene as THREE.Scene).rotateY(
            (targetRotation - lastAppliedRotation) * (Math.PI / 180)
          )
          lastAppliedRotation = targetRotation
        }

        // ── Elevation ─────────────────────────────────────────────────────────
        const fileElevation = (isEditing && tempElevationsRef?.current[modelFile.name] !== undefined)
          ? tempElevationsRef.current[modelFile.name]
          : (modelFile.elevation ?? 0)

        const modelOrigin = [lng, lat] as LngLatLike
        const terrainAltitude = map.queryTerrainElevation([lng, lat]) ?? 0
        const altitude = terrainAltitude + fileElevation

        const modelMatrix = map.transform.getMatrixForModel(modelOrigin, altitude)
        // Reuse temps and write into the camera's own matrix — no per-frame
        // allocation. The previous `.scale(1,1,1)` was an identity no-op. (audit B2)
        _m.fromArray(args.defaultProjectionData.mainMatrix)
        _l.fromArray(modelMatrix)
        this.camera.projectionMatrix.multiplyMatrices(_m, _l)

        if (this.mixer) {
          this.mixer.update((this.clock as THREE.Clock).getDelta())
        }

        this.renderer.resetState()
        this.renderer.render(this.scene, this.camera)

        map.triggerRepaint()
      },

      onRemove() {
        disposed = true
        // Stop + release the animation mixer so it isn't left running/holding the
        // scene after removal (audit B5).
        if (this.mixer) {
          ;(this.mixer as THREE.AnimationMixer).stopAllAction()
          this.mixer = null
        }
        if (this.scene) disposeThreeScene(this.scene as THREE.Scene)
        cameraRef = null
        sceneRef = null
        this.renderer = null
        this.camera = null
        this.scene = null
      },
    }
  }

  /**
   * Raycast against this model using the last rendered frame's camera matrix.
   *
   * The camera.projectionMatrix = VP * M (view-projection × model-to-world),
   * so its inverse transforms clip-space → model-space, which is exactly the
   * coordinate system the Three.js scene lives in. We manually unproject near/far
   * clip-space points through that inverse to build the ray.
   */
  const hitTest = (ndcX: number, ndcY: number): boolean => {
    if (!cameraRef || !sceneRef) return false

    // Invert the combined VP*M matrix to go clip-space → model-space.
    // Reuses module-scope temps + a singleton raycaster (audit B3).
    _hitInv.copy(cameraRef.projectionMatrix).invert()

    // Unproject near and far clip-space points into model space
    _hitNear.set(ndcX, ndcY, -1).applyMatrix4(_hitInv)
    _hitFar.set(ndcX, ndcY, 1).applyMatrix4(_hitInv)

    _hitDir.copy(_hitFar).sub(_hitNear).normalize()

    _raycaster.set(_hitNear, _hitDir)

    const intersects = _raycaster.intersectObjects(sceneRef.children, true)
    return intersects.length > 0
  }

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

  return { cleanup, remove: removeLayer, hitTest }
}
