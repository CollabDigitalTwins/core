import * as THREE from 'three'
import * as OBC from '@thatopen/components'
import { DXFManager } from '../../../DXFLoader'
import { GizmoController } from '../../../../utils/GizmoController'

export interface DxfInfo {
  id: string
  name: string
  file: File
  group: THREE.Group
  position: THREE.Vector3
  scale: number
  rotation: number
  gizmoController?: GizmoController
}

export interface DxfLoadOptions {
  position: THREE.Vector3
  scale?: number
  rotation?: number
  enableGizmo?: boolean
}

export class AddDxf {
  private _bimComponents: OBC.Components
  private _world: OBC.World
  private _dxfManager: DXFManager | null = null
  private _loadedDxfs: Map<string, DxfInfo> = new Map()

  onDxfLoaded = new OBC.Event<DxfInfo>()
  onDxfTransformed = new OBC.Event<DxfInfo>()

  constructor(bimComponents: OBC.Components, world: OBC.World) {
    this._bimComponents = bimComponents
    this._world = world
    this._dxfManager = bimComponents.get(DXFManager)
  }

  async loadDxf(
    file: File,
    id: string,
    options: DxfLoadOptions,
  ): Promise<DxfInfo | null> {
    if (!this._dxfManager) {
      console.error('DXFManager not available in BIM components')
      return null
    }

    try {
      const fileUrl = URL.createObjectURL(file)

      this._dxfManager.scale = options.scale || 0.001
      this._dxfManager.rotation = options.rotation || 0

      const dxfGroup = await this._dxfManager.load(
        fileUrl,
        id,
        file.name,
        {
          x: options.position.x,
          y: options.position.z, // Y and Z swapped for DXF coordinate system
          z: -options.position.y,
        },
      )

      if (!dxfGroup) {
        console.error('Failed to load DXF file')
        URL.revokeObjectURL(fileUrl)
        return null
      }

      dxfGroup.position.copy(options.position)

      let gizmoController: GizmoController | undefined
      if (options.enableGizmo) {
        gizmoController = this.setupGizmo(dxfGroup, id)
      }

      const dxfInfo: DxfInfo = {
        id,
        name: file.name,
        file,
        group: dxfGroup,
        position: options.position.clone(),
        scale: options.scale || 0.001,
        rotation: options.rotation || 0,
        gizmoController,
      }

      this._loadedDxfs.set(id, dxfInfo)

      this.onDxfLoaded.trigger(dxfInfo)

      return dxfInfo
    }
    catch (error) {
      console.error('Error loading DXF file:', error)
      return null
    }
  }

  updateScale(id: string, scale: number): boolean {
    const dxfInfo = this._loadedDxfs.get(id)
    if (!dxfInfo) return false

    dxfInfo.scale = scale
    dxfInfo.group.scale.set(scale, scale, scale)

    this.onDxfTransformed.trigger(dxfInfo)
    return true
  }

  updateRotation(id: string, rotation: number): boolean {
    const dxfInfo = this._loadedDxfs.get(id)
    if (!dxfInfo) return false

    dxfInfo.rotation = rotation
    dxfInfo.group.rotation.z = THREE.MathUtils.degToRad(rotation)

    this.onDxfTransformed.trigger(dxfInfo)
    return true
  }

  updatePosition(id: string, position: THREE.Vector3): boolean {
    const dxfInfo = this._loadedDxfs.get(id)
    if (!dxfInfo) return false

    dxfInfo.position.copy(position)
    dxfInfo.group.position.copy(position)

    this.onDxfTransformed.trigger(dxfInfo)
    return true
  }

  toggleGizmo(id: string, enable: boolean): boolean {
    const dxfInfo = this._loadedDxfs.get(id)
    if (!dxfInfo) return false

    if (enable && !dxfInfo.gizmoController) {
      dxfInfo.gizmoController = this.setupGizmo(dxfInfo.group, id)
      return true
    }
    else if (!enable && dxfInfo.gizmoController) {
      dxfInfo.gizmoController.dispose()
      dxfInfo.gizmoController = undefined
      return true
    }

    return false
  }

  confirmPlacement(id: string): boolean {
    const dxfInfo = this._loadedDxfs.get(id)
    if (!dxfInfo) return false

    if (dxfInfo.gizmoController) {
      dxfInfo.gizmoController.dispose()
      dxfInfo.gizmoController = undefined
    }

    if (this._dxfManager) {
      this._dxfManager.removeTransformControls(dxfInfo.name)
    }

    return true
  }

  removeDxf(id: string): boolean {
    const dxfInfo = this._loadedDxfs.get(id)
    if (!dxfInfo) return false

    this._world.scene.three.remove(dxfInfo.group)

    if (dxfInfo.gizmoController) {
      dxfInfo.gizmoController.dispose()
    }

    this._loadedDxfs.delete(id)

    return true
  }

  getDxf(id: string): DxfInfo | undefined {
    return this._loadedDxfs.get(id)
  }

  getAllDxfs(): DxfInfo[] {
    return [...this._loadedDxfs.values()]
  }

  private setupGizmo(group: THREE.Group, dxfId: string): GizmoController {
    const gizmoController = new GizmoController(this._world)

    const notifyTransform = () => {
      const dxfInfo = this._loadedDxfs.get(dxfId)
      if (dxfInfo) {
        dxfInfo.position.copy(group.position)
        this.onDxfTransformed.trigger(dxfInfo)
      }
    }

    gizmoController.onAccept = notifyTransform
    gizmoController.onCancel = notifyTransform
    gizmoController.setMode('translate')

    gizmoController.attach(group)
    return gizmoController
  }

  static isDxfFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.dxf')
  }

  static validateDxfFile(file: File): { valid: boolean, error?: string } {
    if (!this.isDxfFile(file)) {
      return { valid: false, error: 'File is not a DXF file' }
    }

    return { valid: true }
  }

  dispose(): void {
    for (const dxfInfo of this._loadedDxfs.values()) {
      this._world.scene.three.remove(dxfInfo.group)

      if (dxfInfo.gizmoController) {
        dxfInfo.gizmoController.dispose()
      }
    }

    this._loadedDxfs.clear()
  }
}
