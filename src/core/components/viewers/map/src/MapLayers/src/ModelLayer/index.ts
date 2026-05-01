
import { type CustomLayerInterface, type LngLatLike, type Map } from 'maplibre-gl'
import * as THREE from 'three'
import * as OBC from '@thatopen/components'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { DbFile } from '../../../../../../../types/dbTypes'

function resolveModelCoordinates(file: DbFile): { lng: number, lat: number } {
  if (typeof file.lng === 'number' && typeof file.lat === 'number') {
    return { lng: file.lng, lat: file.lat }
  }

  return { lng: 0, lat: 0 }
}

export const ModelLayer = (modelFile: DbFile, map: Map): { cleanup: () => void, remove: () => void } => {
  console.log('ModelLayer modelFile:', modelFile)

  let fileUrl: string | null = null
  let components: OBC.Components | null = null
  let customLayer: CustomLayerInterface | null = null

  if (!map || !modelFile?.url) {
    return {
      cleanup: () => {},
      remove: () => {},
    } // Return empty functions
  }

  fileUrl = modelFile.url

  const createCustomLayer = (): CustomLayerInterface => {
    if (!map) return

    return {
      id: `model-${modelFile.id}`,
      type: 'custom',
      renderingMode: '3d',
      onAdd(map, gl) {
        // Create OBC components and world
        components = new OBC.Components()

        const worlds = components.get(OBC.Worlds)
        const world = worlds.create<
          OBC.SimpleScene,
          OBC.SimpleCamera,
          OBC.SimpleRenderer
        >()

        // Setup OBC scene for matching lighting with other things on the map
        world.scene = new OBC.SimpleScene(components)
        world.scene.setup()
        world.scene.three.background = null

        // Store references for render method - DON'T clone the scene
        this.scene = world.scene.three.clone()
        this.camera = new THREE.Camera()

        this.renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true,
        })

        this.renderer.autoClear = false
        this.components = components
        this.clock = new THREE.Clock()

        // Load GLTF/GLB model from File
        const loader = new GLTFLoader()
        loader.load(
          fileUrl!,
          (gltf) => {
            // Scale the model if needed
            gltf.scene.scale.setScalar(1)

            // set up animation using animation mixer
            if (gltf.animations && gltf.animations.length > 0) {
              this.mixer = new THREE.AnimationMixer(gltf.scene)

              for (const clip of gltf.animations) {
                const action = this.mixer!.clipAction(clip)
                action.play()
              }
            }

            this.scene.add(gltf.scene)
          },
          (progress) => {
            // console.log('Loading progress:', progress);
          },
          (error) => {
            console.error('Error loading model:', error)
          },
        )
      },
      render(gl, args) {
        if (map.getZoom() < 15.5) return
        // determine model scenen and camera placement
        const { lng, lat } = resolveModelCoordinates(modelFile)
        if (lng === 0 && lat === 0) return
        const modelOrigin = [lng, lat] as LngLatLike
        const altitude
            = map.queryTerrainElevation([lng, lat]) ?? 0
        const modelAltitude = altitude

        const scaling = 1
        const modelMatrix = map.transform.getMatrixForModel(
          modelOrigin,
          modelAltitude,
        )
        const m = new THREE.Matrix4().fromArray(
          args.defaultProjectionData.mainMatrix,
        )
        const l = new THREE.Matrix4()
          .fromArray(modelMatrix)
          .scale(new THREE.Vector3(scaling, scaling, scaling))

        this.camera.projectionMatrix = m.multiply(l)

        // 3) Advance any active animations:
        if (this.mixer) {
          const delta = this.clock.getDelta()
          this.mixer.update(delta)
        }

        // Render the scene
        this.renderer.resetState()
        this.renderer.render(this.scene, this.camera)

        map.triggerRepaint()
      },
      onRemove() {
        // Dispose of OBC components
        if (this.components) {
          this.components.dispose()
        }
      },
    }
  }

  customLayer = createCustomLayer()

  // Add layer if it doesn't exist
  if (!map.getLayer(customLayer.id)) {
    console.log(`Adding layer: ${customLayer.id}`, customLayer)
    map.addLayer(customLayer)
  }

  // Function to remove the layer from the map
  const removeLayer = () => {
    if (customLayer && map.getLayer(customLayer.id)) {
      map.removeLayer(customLayer.id)
      console.log(`Removed layer: ${customLayer.id}`)
    }
  }

  // Full cleanup function (removes layer and cleans up resources)
  const cleanup = () => {
    // Remove layer from map
    removeLayer()

    // Dispose of OBC components
    if (components) {
      components.dispose()
      components = null
    }

    // Clear references
    customLayer = null

    console.log(`Cleaned up model layer for file: ${modelFile.id}`)
  }

  // Return both functions
  return {
    cleanup,
    remove: removeLayer,
  }
}
