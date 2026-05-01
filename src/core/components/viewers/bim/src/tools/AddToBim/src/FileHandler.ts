import * as THREE from 'three'
import * as OBC from '@thatopen/components'
import { ModelManager } from '../../../ModelManager'
import { AddDxf } from './AddDxf'
import {
  AddedFile,
  createFileMarker,
  updateMarkerPosition,
  createGenericFileMarker,
} from './FileMarkerUtils'

const subscribeToGizmoTransformEnd = (
  gizmoController: THREE.GizmoController | null | undefined,
  callback: () => void,
) => {
  if (!gizmoController)
    return

  const controller = gizmoController as unknown as Record<string, unknown>
  const eventKeys = ['onTransformEnd', 'onAfterTransform', 'onChange', 'onUpdated']

  for (const key of eventKeys) {
    const eventCandidate = controller[key] as { add?: (fn: () => void) => void } | undefined
    if (eventCandidate && typeof eventCandidate.add === 'function') {
      eventCandidate.add(callback)
      return
    }
  }
}

export const addFileToScene = async (
  addedFile: AddedFile,
  fileScale: number,
  fileRotation: number,
  world: OBC.World | null,
  modelManager: ModelManager | null,
  addDxf: AddDxf | null,
  toolsDispatch: any,
  setCurrent3DFileId: (id: string | null) => void,
  onMarkerContextMenu?: (event: MouseEvent) => void,
) => {
  if (!world || !modelManager || !addDxf) return

  const fileName = addedFile.file.name.toLowerCase()

  // Handle 3D models (GLB/GLTF)
  if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
    try {
      const modelInfo = await modelManager.load(
        addedFile.file,
        addedFile.id,
        addedFile.file.name,
        {
          position: addedFile.position,
          scale: fileScale,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(fileRotation), 0),
          enableGizmo: true,
          enableAnimations: true,
        },
      )

      if (modelInfo) {
        // Store current 3D file ID for real-time updates
        setCurrent3DFileId(addedFile.id)

        // Create CSS2D label for the 3D model
        const markerObj = createFileMarker(addedFile, modelInfo.model, () => {
          // Click on marker — no-op (actions handled via sidebar/context menu)
        }, world, onMarkerContextMenu)

        // Set up transform listener to update marker position
        subscribeToGizmoTransformEnd(modelInfo.gizmoController, () => {
          updateMarkerPosition(markerObj, modelInfo.model)
        })

        // Initial marker position update after model is loaded
        setTimeout(() => {
          updateMarkerPosition(markerObj, modelInfo.model)
        }, 100)
      }
    }
    catch (error) {
      console.error('Error loading 3D model:', error)
    }
    return
  }

  // Handle DXF files
  if (fileName.endsWith('.dxf')) {
    try {
      const dxfInfo = await addDxf.loadDxf(
        addedFile.file,
        addedFile.id,
        {
          position: addedFile.position,
          scale: fileScale,
          rotation: fileRotation,
          enableGizmo: true,
        },
      )

      if (dxfInfo) {
        // Store current 3D file ID for real-time updates
        setCurrent3DFileId(addedFile.id)

        // Create CSS2D label for the DXF
        const markerObj = createFileMarker(addedFile, dxfInfo.group, () => {
          // Click on marker — no-op (actions handled via sidebar/context menu)
        }, world, onMarkerContextMenu)

        // Set up transform listener to update marker position
        addDxf.onDxfTransformed.add((transformedDxfInfo) => {
          if (transformedDxfInfo.id === addedFile.id) {
            updateMarkerPosition(markerObj, dxfInfo.group)
          }
        })

        // Initial marker position update after DXF is loaded
        setTimeout(() => {
          updateMarkerPosition(markerObj, dxfInfo.group)
        }, 100)
      }
    }
    catch (error) {
      console.error('Error loading DXF file:', error)
    }
    return
  }

  // Handle other files (create sphere marker)
  createGenericFileMarker(addedFile, world, toolsDispatch, onMarkerContextMenu)
}
