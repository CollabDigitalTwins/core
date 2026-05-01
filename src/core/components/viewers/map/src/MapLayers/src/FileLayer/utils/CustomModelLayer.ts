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

  const createCustomLayer = (): CustomLayerInterface => {
    // Track last applied rotation so we can apply delta increments (same as BimLayer)
    let lastAppliedRotation = modelFile.rotation ?? 0

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
            gltf.scene.scale.setScalar(1)

            if (gltf.animations && gltf.animations.length > 0) {
              this.mixer = new THREE.AnimationMixer(gltf.scene)
              for (const clip of gltf.animations) {
                this.mixer!.clipAction(clip).play()
              }
            }

            scene.add(gltf.scene)
          },
          undefined,
          (error) => { console.error('Error loading model:', error) },
        )
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
        const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix)
        const l = new THREE.Matrix4()
          .fromArray(modelMatrix)
          .scale(new THREE.Vector3(1, 1, 1))

        this.camera.projectionMatrix = m.multiply(l)

        if (this.mixer) {
          this.mixer.update((this.clock as THREE.Clock).getDelta())
        }

        this.renderer.resetState()
        this.renderer.render(this.scene, this.camera)

        map.triggerRepaint()
      },

      onRemove() {
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

    // Invert the combined VP*M matrix to go clip-space → model-space
    const inverseMatrix = cameraRef.projectionMatrix.clone().invert()

    // Unproject near and far clip-space points into model space
    const near = new THREE.Vector3(ndcX, ndcY, -1).applyMatrix4(inverseMatrix)
    const far  = new THREE.Vector3(ndcX, ndcY,  1).applyMatrix4(inverseMatrix)

    const direction = far.clone().sub(near).normalize()

    const raycaster = new THREE.Raycaster()
    raycaster.set(near, direction)

    const intersects = raycaster.intersectObjects(sceneRef.children, true)
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
