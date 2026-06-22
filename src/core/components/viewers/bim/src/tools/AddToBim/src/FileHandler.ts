// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import * as OBC from '@thatopen/components'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { ModelManager } from '../../../ModelManager'
import { AddDxf } from './AddDxf'
import {
  AddedFile,
  createFileMarker,
  createGenericFileMarker,
} from './FileMarkerUtils'
import type { FileMarkerAction } from '../../../../../../ui/FilesManager/src/FileMarker'

export type PlacedKind = 'dxf' | 'model' | 'generic'

export interface PlacedResult {
  kind: PlacedKind
  marker: CSS2DObject | null
  object3D: THREE.Object3D
}

export const addFileToScene = async (
  addedFile: AddedFile,
  fileScale: number,
  fileRotation: number,
  world: OBC.World | null,
  modelManager: ModelManager | null,
  addDxf: AddDxf | null,
  setCurrent3DFileId: (id: string | null) => void,
  onAction?: (action: FileMarkerAction) => void,
): Promise<PlacedResult | null> => {
  if (!world || !modelManager || !addDxf) return null

  const fileName = addedFile.file.name.toLowerCase()

  if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
    const modelInfo = await modelManager.load(addedFile.file, addedFile.id, addedFile.file.name, {
      position: addedFile.position,
      scale: fileScale,
      rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(fileRotation), 0),
      enableGizmo: true,
      enableAnimations: true,
    })
    if (!modelInfo) return null

    setCurrent3DFileId(addedFile.id)
    const marker = createFileMarker(addedFile, modelInfo.model, world, onAction)
    return { kind: 'model', marker, object3D: modelInfo.model }
  }

  if (fileName.endsWith('.dxf')) {
    const dxfInfo = await addDxf.loadDxf(addedFile.file, addedFile.id, {
      position: addedFile.position,
      scale: fileScale,
      rotation: fileRotation,
      enableGizmo: true,
    })
    if (!dxfInfo) return null

    setCurrent3DFileId(addedFile.id)
    const marker = createFileMarker(addedFile, dxfInfo.group, world, onAction)
    return { kind: 'dxf', marker, object3D: dxfInfo.group }
  }

  const { marker, object3D } = createGenericFileMarker(addedFile, world, onAction)
  return { kind: 'generic', marker, object3D }
}
