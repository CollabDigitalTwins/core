// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'

import { GizmoController } from '../../../../utils/GizmoController'
import { DXFManager } from '../../../DXFLoader'

export interface DxfInfo {
  id: string
  name: string
  file: File
  group: THREE.Group
  position: THREE.Vector3
  scale: number
  rotation: number
  fileUrl: string
  gizmoController?: GizmoController
}

export interface DxfLoadOptions {
  position: THREE.Vector3
  scale?: number
  rotation?: number
  enableGizmo?: boolean
}

const DEFAULT_SCALE = 0.001 // DXF authored in millimetres → metres

export class AddDxf {
  private _world: OBC.World
  private _dxfManager: DXFManager | null
  private _loadedDxfs: Map<string, DxfInfo> = new Map()

  onDxfLoaded = new OBC.Event<DxfInfo>()
  onDxfTransformed = new OBC.Event<DxfInfo>()

  constructor(bimComponents: OBC.Components, world: OBC.World) {
    this._world = world
    this._dxfManager = bimComponents.get(DXFManager)
  }

  async loadDxf(file: File, id: string, options: DxfLoadOptions): Promise<DxfInfo | null> {
    if (!this._dxfManager) {
      console.error('DXFManager not available in BIM components')
      return null
    }

    const fileUrl = URL.createObjectURL(file)
    try {
      const group = await this._dxfManager.parse(fileUrl)
      const scale = options.scale ?? DEFAULT_SCALE
      const rotation = options.rotation ?? 0

      group.name = id
      group.position.copy(options.position)
      group.scale.setScalar(scale)
      group.rotation.y = THREE.MathUtils.degToRad(rotation)
      this._world.scene.three.add(group)

      const dxfInfo: DxfInfo = {
        id,
        name: file.name,
        file,
        group,
        position: options.position.clone(),
        scale,
        rotation,
        fileUrl,
      }

      if (options.enableGizmo) {
        dxfInfo.gizmoController = this.setupGizmo(group, id)
      }

      this._loadedDxfs.set(id, dxfInfo)
      this.onDxfLoaded.trigger(dxfInfo)
      return dxfInfo
    }
    catch (error) {
      console.error('Error loading DXF file:', error)
      URL.revokeObjectURL(fileUrl)
      return null
    }
  }

  updateScale(id: string, scale: number): boolean {
    const dxfInfo = this._loadedDxfs.get(id)
    if (!dxfInfo) return false
    dxfInfo.scale = scale
    dxfInfo.group.scale.setScalar(scale)
    this.onDxfTransformed.trigger(dxfInfo)
    return true
  }

  updateRotation(id: string, rotation: number): boolean {
    const dxfInfo = this._loadedDxfs.get(id)
    if (!dxfInfo) return false
    dxfInfo.rotation = rotation
    dxfInfo.group.rotation.y = THREE.MathUtils.degToRad(rotation)
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
    if (!enable && dxfInfo.gizmoController) {
      dxfInfo.gizmoController.dispose()
      dxfInfo.gizmoController = undefined
      return true
    }
    return false
  }

  setGizmoMode(id: string, mode: 'translate' | 'rotate' | 'scale'): void {
    this._loadedDxfs.get(id)?.gizmoController?.setMode(mode)
  }

  confirmPlacement(id: string): boolean {
    const dxfInfo = this._loadedDxfs.get(id)
    if (!dxfInfo) return false
    dxfInfo.gizmoController?.dispose()
    dxfInfo.gizmoController = undefined
    return true
  }

  removeDxf(id: string): boolean {
    const dxfInfo = this._loadedDxfs.get(id)
    if (!dxfInfo) return false
    this._world.scene.three.remove(dxfInfo.group)
    dxfInfo.gizmoController?.dispose()
    URL.revokeObjectURL(dxfInfo.fileUrl)
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

    // Enter/Esc detach the gizmo internally; clear our reference so callers
    // (and the marker visibility check) know editing has ended.
    const endEditing = () => {
      const dxfInfo = this._loadedDxfs.get(dxfId)
      if (!dxfInfo) return
      dxfInfo.position.copy(group.position)
      dxfInfo.scale = group.scale.x
      dxfInfo.rotation = THREE.MathUtils.radToDeg(group.rotation.y)
      dxfInfo.gizmoController = undefined
      this.onDxfTransformed.trigger(dxfInfo)
    }

    gizmoController.onAccept = endEditing
    gizmoController.onCancel = endEditing
    gizmoController.setMode('translate')
    gizmoController.attach(group)
    return gizmoController
  }

  static isDxfFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.dxf')
  }

  dispose(): void {
    for (const dxfInfo of this._loadedDxfs.values()) {
      this._world.scene.three.remove(dxfInfo.group)
      dxfInfo.gizmoController?.dispose()
      URL.revokeObjectURL(dxfInfo.fileUrl)
    }
    this._loadedDxfs.clear()
  }
}
