import * as THREE from 'three'
import * as OBC from '@thatopen/components'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js'
import { CurrentWorld } from '../CurrentWorld'
import { GizmoController } from '../../utils/GizmoController'
import { ViewportGizmo } from '../ViewportGizmo'

export interface ModelInfo {
  id: string
  name: string
  model: THREE.Group
  mixer?: THREE.AnimationMixer
  gizmoController?: GizmoController
  fileUrl?: string
}

export interface LoadModelOptions {
  position?: THREE.Vector3
  scale?: number | THREE.Vector3
  rotation?: THREE.Euler
  enableGizmo?: boolean
  enableAnimations?: boolean
  extension?: string
}

export class ModelManager extends OBC.Component {
  static uuid = '4cf01658-4a4e-49bd-8c89-4574db0032e9' as const

  enabled = true

  onModelLoaded = new OBC.Event<ModelInfo>()
  onModelTransformed = new OBC.Event<ModelInfo>()

  private _components: OBC.Components
  private _world: OBC.World | null = null
  private _gltfLoader: GLTFLoader
  private _objLoader: OBJLoader 
  private _fbxLoader: FBXLoader 
  private _colladaLoader: ColladaLoader 
  private _models: Map<string, ModelInfo> = new Map()
  private _animationClock: THREE.Clock = new THREE.Clock()
  private _animationId: number | null = null

  constructor(components: OBC.Components) {
    super(components)
    components.add(ModelManager.uuid, this)
    this._components = components
    this._gltfLoader = new GLTFLoader()
    this._objLoader = new OBJLoader()
    this._fbxLoader = new FBXLoader()
    this._colladaLoader = new ColladaLoader()
    this._world = components.get(CurrentWorld).world
    this.startAnimationLoop()
  }

  /**
   * Load a 3D model (GLB/GLTF/OBJ/FBX/DAE) from a file or URL
   */
  async load(
    fileOrUrl: File | string,
    id: string,
    name: string,
    options: LoadModelOptions = {},
  ): Promise<ModelInfo | null> {
    if (!this._world) {
      console.error('World not available for model loading')
      return null
    }

    try {
      let fileUrl: string

      fileUrl = fileOrUrl instanceof File ? URL.createObjectURL(fileOrUrl) : fileOrUrl

      const extension = options.extension || this.getFileExtension(fileOrUrl)

      const result = await this.loadModelByType(fileUrl, extension)
      const model = result.scene || result

      if (options.position) {
        model.position.copy(options.position)
      }

      if (options.scale) {
        if (typeof options.scale === 'number') {
          model.scale.setScalar(options.scale)
        }
        else {
          model.scale.copy(options.scale)
        }
      }

      if (options.rotation) {
        model.rotation.copy(options.rotation)
      }

      this._world.scene.three.add(model)


      let mixer: THREE.AnimationMixer | undefined
      if (options.enableAnimations && result.animations && result.animations.length > 0) {
        mixer = this.setupAnimations(model, result.animations)
      }

      let gizmoController: GizmoController | undefined
      if (options.enableGizmo) {
        gizmoController = this.setupGizmo(model)
      }

      const modelInfo: ModelInfo = {
        id,
        name,
        model,
        mixer,
        gizmoController,
        fileUrl: fileOrUrl instanceof File ? fileUrl : undefined,
      }

      this._models.set(id, modelInfo);

      (model as any).modelId = id

      this.onModelLoaded.trigger(modelInfo)

      return modelInfo
    }
    catch (error) {
      console.error('Error loading 3D model:', error)

      if (fileOrUrl instanceof File) {
        URL.revokeObjectURL(fileOrUrl instanceof File ? URL.createObjectURL(fileOrUrl) : '')
      }

      return null
    }
  }

  /**
   * Remove a model from the scene
   */
  remove(id: string): boolean {
    const modelInfo = this._models.get(id)
    if (!modelInfo || !this._world) return false

    this._world.scene.three.remove(modelInfo.model)


    if (modelInfo.gizmoController) {
      modelInfo.gizmoController.dispose()
    }

    // Cleanup mixer
    if (modelInfo.mixer) {
      modelInfo.mixer.stopAllAction()
    }

    // Cleanup file URL if it exists
    if (modelInfo.fileUrl) {
      URL.revokeObjectURL(modelInfo.fileUrl)
    }

    // Remove from storage
    this._models.delete(id)

    return true
  }

  /**
   * Get model info by ID
   */
  getModel(id: string): ModelInfo | undefined {
    return this._models.get(id)
  }

  /**
   * Get model info by name (file.name)
   */
  getModelByName(name: string): ModelInfo | undefined {
    for (const modelInfo of this._models.values()) {
      if (modelInfo.name === name) return modelInfo
    }
    return undefined
  }

  /**
   * Get all loaded models
   */
  getAllModels(): ModelInfo[] {
    return [...this._models.values()]
  }

  /**
   * Enable/disable gizmo for a model
   */
  toggleGizmo(id: string, enable: boolean): boolean {
    const modelInfo = this._models.get(id)
    if (!modelInfo || !this._world) return false

    if (enable && !modelInfo.gizmoController) {
      modelInfo.gizmoController = this.setupGizmo(modelInfo.model)
      return true
    }
    else if (!enable && modelInfo.gizmoController) {
      modelInfo.gizmoController.dispose()
      modelInfo.gizmoController = undefined
      return true
    }

    return false
  }

  /**
   * Update model position
   */
  setPosition(id: string, position: THREE.Vector3): boolean {
    const modelInfo = this._models.get(id)
    if (!modelInfo) return false

    modelInfo.model.position.copy(position)
    this.onModelTransformed.trigger(modelInfo)
    return true
  }

  /**
   * Update model scale
   */
  setScale(id: string, scale: number | THREE.Vector3): boolean {
    const modelInfo = this._models.get(id)
    if (!modelInfo) return false

    if (typeof scale === 'number') {
      modelInfo.model.scale.setScalar(scale)
    }
    else {
      modelInfo.model.scale.copy(scale)
    }

    this.onModelTransformed.trigger(modelInfo)
    return true
  }

  /**
   * Update model rotation
   */
  setRotation(id: string, rotation: THREE.Euler): boolean {
    const modelInfo = this._models.get(id)
    if (!modelInfo) return false

    modelInfo.model.rotation.copy(rotation)
    this.onModelTransformed.trigger(modelInfo)
    return true
  }

  /**
   * Get file extension from File or URL
   */
  private getFileExtension(fileOrUrl: File | string): string {
    if (fileOrUrl instanceof File) {
      return fileOrUrl.name.split('.').pop()?.toLowerCase() || ''
    }
    const urlPath = fileOrUrl.split('?')[0]
    return urlPath.split('.').pop()?.toLowerCase() || ''
  }

  /**
   * Load model based on file type
   */
  private async loadModelByType(url: string, extension: string): Promise<any> {
    switch (extension) {
      case 'gltf':
      case 'glb':
        return this.loadGLTF(url)
      case 'obj':
        return this.loadOBJ(url)
      case 'fbx':
        return this.loadFBX(url)
      case 'dae':
      case 'collada':
        return this.loadCollada(url)
      default:
        throw new Error(`Unsupported file format: ${extension}`)
    }
  }

  /**
   * Load GLTF file using promise
   */
  private loadGLTF(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this._gltfLoader.load(
        url,
        gltf => resolve(gltf),
        undefined,
        error => reject(error),
      )
    })
  }

  /**
   * Load OBJ file using promise
   */
  private loadOBJ(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this._objLoader.load(
        url,
        obj => resolve(obj),
        undefined,
        error => reject(error),
      )
    })
  }

  /**
   * Load FBX file using promise
   */
  private loadFBX(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this._fbxLoader.load(
        url,
        fbx => resolve(fbx),
        undefined,
        error => reject(error),
      )
    })
  }

  /**
   * Load Collada file using promise
   */
  private loadCollada(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this._colladaLoader.load(
        url,
        collada => resolve(collada),
        undefined,
        error => reject(error),
      )
    })
  }

  /**
   * Setup animations for a model
   */
  private setupAnimations(model: THREE.Group, animations: THREE.AnimationClip[]): THREE.AnimationMixer {
    const mixer = new THREE.AnimationMixer(model)

    for (const clip of animations) {
      const action = mixer.clipAction(clip)
      action.play()
    }

    return mixer
  }

  /**
   * Setup gizmo controls for a model
   */
  private setupGizmo(model: THREE.Group): GizmoController {
    if (!this._world) {
      throw new Error('World not available for gizmo setup')
    }

    const gizmoController = new GizmoController(this._world)
    gizmoController.attach(model)
    return gizmoController
  }

  /**
   * Start animation loop for all mixers
   */
  private startAnimationLoop(): void {
    const animate = () => {
      const delta = this._animationClock.getDelta()

      for (const [, modelInfo] of this._models) {
        if (modelInfo.mixer) {
          modelInfo.mixer.update(delta)
        }
      }

      try {
        const viewportGizmo = this._components.get(ViewportGizmo)
        if (viewportGizmo && viewportGizmo.enabled) {
          viewportGizmo.render()
        }
      }
      catch {}

      this._animationId = requestAnimationFrame(animate)
    }

    animate()
  }

  /**
   * Stop animation loop
   */
  private stopAnimationLoop(): void {
    if (this._animationId !== null) {
      cancelAnimationFrame(this._animationId)
      this._animationId = null
    }
  }

  /**
   * Dispose and cleanup all resources
   */
  dispose(): void {
    this.stopAnimationLoop()

    for (const modelInfo of this._models.values()) {
      if (this._world) {
        this._world.scene.three.remove(modelInfo.model)
      }

      if (modelInfo.gizmoController) {
        modelInfo.gizmoController.dispose()
      }

      if (modelInfo.mixer) {
        modelInfo.mixer.stopAllAction()
      }

      if (modelInfo.fileUrl) {
        URL.revokeObjectURL(modelInfo.fileUrl)
      }
    }

    this._models.clear()
  }
}
