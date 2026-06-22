// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import * as OBC from '@thatopen/components'
import { DxfViewer } from 'dxf-viewer'

/**
 * Parses DXF files into THREE.Groups for the BIM world. This is a pure parser:
 * it owns no scene placement, transforms or gizmos — the caller (AddDxf) decides
 * where the drawing goes. A single off-screen DxfViewer is reused as the parser.
 */
export class DXFManager extends OBC.Component {
  static uuid = '2cf1b746-3b3d-4988-960b-ea640e0e8925' as const

  enabled = true

  private readonly _container = document.createElement('bim-viewport')
  private _dxfViewer: DxfViewer

  constructor(components: OBC.Components) {
    super(components)
    components.add(DXFManager.uuid, this)
    this._dxfViewer = new DxfViewer(this._container, null)
  }

  /**
   * Load and parse a DXF into a THREE.Group centered on its own origin and laid
   * flat on the world ground (XZ) plane. DXF coordinates can carry huge offsets,
   * so recentering keeps the drawing co-located with whatever point it is placed at.
   */
  async parse(url: string): Promise<THREE.Group> {
    await this._dxfViewer.Load({
      url,
      fonts: ['/fonts/Roboto-LightItalic.ttf'],
      progressCbk: null,
      workerFactory: null,
    })

    const inner = new THREE.Group()
    const dxfScene = this._dxfViewer.GetScene()
    for (const child of [...dxfScene.children]) {
      this.flattenTo3D(child)
      inner.add(child)
    }

    // Recenter geometry on the group origin so placement lands the drawing's
    // center at the chosen point regardless of the DXF's authored coordinates.
    const box = new THREE.Box3().setFromObject(inner)
    if (!box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3())
      for (const child of inner.children) child.position.sub(center)
    }

    // DXF is authored in the XY plane; tip it onto the world XZ ground plane (Y up).
    inner.rotateX(THREE.MathUtils.degToRad(-90))

    const group = new THREE.Group()
    group.add(inner)
    return group
  }

  /** DxfViewer line geometry is 2D (x, y); promote it to 3D (x, y, 0) for the world scene. */
  private flattenTo3D(object: THREE.Object3D) {
    if (!('geometry' in object)) return
    const geometry = object.geometry as THREE.BufferGeometry
    const position = geometry.getAttribute('position')
    if (!position || position.itemSize === 3) return

    const flattened: number[] = []
    for (let i = 0; i < position.array.length; i += position.itemSize) {
      flattened.push(position.array[i], position.array[i + 1], 0)
    }
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(flattened), 3),
    )
  }

  dispose() {
    ;(this._dxfViewer as unknown as { Destroy?: () => void }).Destroy?.()
  }
}
