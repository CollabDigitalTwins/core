// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import { disposeObject3D } from '../../../lib/disposeObject3D'

import { createGenericFileMarker, removeMarker } from './FileMarkerUtils'


import type { AddDxf } from './AddDxf'
import type {
  AddedFile} from './FileMarkerUtils';
import type { FileMarkerAction } from '../../../../../../ui/FilesManager/src/FileMarker'
import type { ModelManager } from '../../../ModelManager'
import type * as OBC from '@thatopen/components'
import type { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'



export type PlacedKind = 'dxf' | 'model' | 'generic'

export interface PlacedResult {
  kind: PlacedKind
  marker: CSS2DObject | null
  object3D: THREE.Object3D
  dispose?: () => void
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
    })
    if (!modelInfo) return null

    setCurrent3DFileId(addedFile.id)
    return {
      kind: 'model',
      marker: null,
      object3D: modelInfo.model,
      dispose: () => { modelManager.remove(addedFile.id) },
    }
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
    return {
      kind: 'dxf',
      marker: null,
      object3D: dxfInfo.group,
      dispose: () => { addDxf.removeDxf(addedFile.id) },
    }
  }

  const { marker, object3D } = createGenericFileMarker(addedFile, world, onAction)
  return {
    kind: 'generic',
    marker,
    object3D,
    dispose: () => { removeMarker(marker, world); disposeObject3D(object3D) },
  }
}
