"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react"
import { toast } from "sonner"
import * as THREE from "three"

import { getFileExtension } from "../../../../../../../utils/utils"
import { Cursor } from "../../../Cursor"
import { Highlighter } from "../../../Highlighter"
import { ModelManager } from "../../../ModelManager"


import { AddDxf } from "./AddDxf"
import { addFileToScene, type PlacedKind } from "./FileHandler"
import { type AddedFile, removeMarker } from "./FileMarkerUtils"

import type { FileMarkerAction } from "../../../../../../ui/FilesManager/src/FileMarker"
import type { BimToolbarToolsType } from "../../bimToolbar"
import type * as OBC from "@thatopen/components"
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js"


export type GizmoMode = "translate" | "rotate" | "scale"

export interface PlacedFile {
  id: string
  name: string
  kind: PlacedKind
  marker: CSS2DObject | null
  object3D: THREE.Object3D
}

// Horizontal floor at world height 0; used when a double-click misses all BIM geometry.
const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

const pointOnGroundPlane = (
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): THREE.Vector3 | null => {
  const rect = canvas.getBoundingClientRect()
  const ndc = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  )
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(ndc, camera)
  const target = new THREE.Vector3()
  return raycaster.ray.intersectPlane(GROUND_PLANE, target) ? target : null
}

export function useFilePlacement(
  bimComponents: OBC.Components | null,
  world: OBC.World | null,
  fragments: OBC.FragmentsManager | null,
  toolsDispatch: React.Dispatch<any>,
  buildingId: number,
  uploadFileToDB?: (args: { fileData: any; buildingId: number }) => Promise<any>,
  onMarkerAction?: (id: string, action: FileMarkerAction) => void,
) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 })
  const [isPlacingFile, setIsPlacingFile] = React.useState(false)

  const [fileScale, setFileScale] = React.useState(1)
  const [fileRotation, setFileRotation] = React.useState(0)
  const [show3DScaleCard, setShow3DScaleCard] = React.useState(false)
  const [current3DFileId, setCurrent3DFileId] = React.useState<string | null>(null)
  const [current3DFileType, setCurrent3DFileType] = React.useState<"dxf" | "model" | null>(null)

  const [modelManager, setModelManager] = React.useState<ModelManager | null>(null)
  const [addDxf, setAddDxf] = React.useState<AddDxf | null>(null)

  const placedFilesRef = React.useRef<Map<string, PlacedFile>>(new Map())
  const [markerCount, setMarkerCount] = React.useState(0)

  const highlighter = React.useMemo(() => {
    if (!bimComponents) return null
    try { return bimComponents.get(Highlighter) } catch { return null }
  }, [bimComponents])

  React.useEffect(() => {
    if (!bimComponents || !world) return
    if (!modelManager) {
      const manager = bimComponents.get(ModelManager)
      if (manager) setModelManager(manager)
    }
    if (!addDxf) setAddDxf(new AddDxf(bimComponents, world))
  }, [bimComponents, world, modelManager, addDxf])

  const setCursor = React.useCallback((cursor: string) => {
    if (!bimComponents) return
    const currentCursor = bimComponents.get(Cursor)
    if (currentCursor) currentCursor.cursor = cursor as any
  }, [bimComponents])

  const raycast = React.useCallback(async (data: {
    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera
    mouse: THREE.Vector2
    dom: HTMLCanvasElement
  }) => {
    if (!fragments || !highlighter) return null

    const results = []
    for (const [modelName, model] of fragments.core.models.list) {
      if (highlighter.isModelDisabled(modelName)) continue
      const result = await model.raycast(data)
      if (result) results.push(result)
    }
    if (results.length === 0) return null

    let closest = results[0]
    for (let i = 1; i < results.length; i++) {
      if (results[i].distance < closest.distance) closest = results[i]
    }
    return closest
  }, [fragments, highlighter])

  const processFileObject = React.useCallback((file: File, addingMode: BimToolbarToolsType) => {
    const fileName = file.name.toLowerCase()

    if (addingMode === "bim-add-cad") {
      if (!fileName.endsWith(".dxf")) {
        toast.error("Please select a valid CAD file (.dxf)")
        return
      }
      setShow3DScaleCard(true)
      setCurrent3DFileType("dxf")
      setFileScale(0.001)
    } else if (addingMode === "bim-add-file") {
      if (fileName.endsWith(".glb") || fileName.endsWith(".gltf")) {
        setShow3DScaleCard(true)
        setCurrent3DFileType("model")
        setFileScale(1)
      } else if (fileName.endsWith(".dxf")) {
        setShow3DScaleCard(true)
        setCurrent3DFileType("dxf")
        setFileScale(0.001)
      }
    }

    setSelectedFile(file)
    setIsPlacingFile(true)
    setCursor("crosshair")
    toast.info(`Double-click in the scene to place: "${file.name}"`, {
      id: 'place-bim-file-toast',
      duration: Infinity,
    })
  }, [setCursor])

  const handleFileSelect = React.useCallback((event: React.ChangeEvent<HTMLInputElement>, addingMode: BimToolbarToolsType) => {
    const file = event.target.files?.[0]
    if (file) processFileObject(file, addingMode)
  }, [processFileObject])

  const handleFileDrop = React.useCallback((file: File, addingMode: BimToolbarToolsType) => {
    processFileObject(file, addingMode)
  }, [processFileObject])

  const cancelPlacement = React.useCallback(() => {
    setSelectedFile(null)
    setIsPlacingFile(false)
    setShow3DScaleCard(false)
    setCurrent3DFileId(null)
    setCurrent3DFileType(null)
    setFileScale(1)
    setFileRotation(0)
    setCursor("")
    toast.dismiss('place-bim-file-toast')
    toolsDispatch({ type: "CLEAR-TOOLS" })
  }, [setCursor, toolsDispatch])

  const uploadPlacedFile = React.useCallback(async (file: File, point: THREE.Vector3, rotation = 0) => {
    if (!uploadFileToDB || buildingId <= 0) return
    try {
      const assetId = crypto.randomUUID()
      const presignedResponse = await fetch(`/api/presigned-url-upload?asset=${assetId}`)
      if (!presignedResponse.ok) return
      const { presignedUrl } = await presignedResponse.json()
      await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })
      await uploadFileToDB({
        fileData: {
          name: file.name,
          type: "bim-file",
          mimeType: file.type,
          extension: getFileExtension(file),
          sizeBytes: file.size,
          tag: "file",
          uploadedAt: new Date().toISOString(),
          url: "",
          assetId,
          description: "",
          attachedFilesBuildingId: buildingId,
          isVisible: true,
          x: point.x,
          y: point.y,
          z: point.z,
          rotation,
        },
        buildingId,
      })
    } catch (err) {
      console.error("Error uploading placed file:", err)
    }
  }, [uploadFileToDB, buildingId])

  React.useEffect(() => {
    if (!selectedFile || !bimComponents || !world || !isPlacingFile) return

    const mouse = new THREE.Vector2()
    const canvas = world.renderer!.three.domElement!

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
      mouse.x = e.clientX
      mouse.y = e.clientY
    }

    const handleDblClick = async (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY

      const modelHit = await raycast({ camera: world.camera.three, mouse, dom: canvas })
      const point = modelHit?.point
        ? modelHit.point.clone()
        : pointOnGroundPlane(world.camera.three, canvas, e.clientX, e.clientY)
      if (!point) return

      const addedFile: AddedFile = {
        id: Date.now().toString(),
        file: selectedFile,
        position: point,
        imageUrl: selectedFile.type.startsWith("image/")
          ? URL.createObjectURL(selectedFile)
          : undefined,
      }

      const placed = await addFileToScene(
        addedFile, fileScale, fileRotation,
        world, modelManager, addDxf, setCurrent3DFileId,
        (action) => onMarkerAction?.(addedFile.id, action),
      )

      if (placed) {
        placedFilesRef.current.set(addedFile.id, {
          id: addedFile.id,
          name: selectedFile.name,
          kind: placed.kind,
          marker: placed.marker,
          object3D: placed.object3D,
        })
        setMarkerCount(c => c + 1)
      }

      const fileName = selectedFile.name.toLowerCase()
      const is3DFile = fileName.endsWith(".dxf") || fileName.endsWith(".glb") || fileName.endsWith(".gltf")
      if (is3DFile) {
        // Persist on confirm instead, so the final position/rotation is saved.
        setIsPlacingFile(false)
        setCursor("")
      } else {
        void uploadPlacedFile(selectedFile, point)
        cancelPlacement()
      }
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("dblclick", handleDblClick)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("dblclick", handleDblClick)
    }
  }, [selectedFile, bimComponents, world, isPlacingFile, fileScale, fileRotation, modelManager, addDxf, toolsDispatch, raycast, cancelPlacement, setCursor, uploadPlacedFile, onMarkerAction])

  const confirmPlacement = React.useCallback(() => {
    if (!current3DFileId) return

    // Capture the final transform from the placed object, then persist it.
    let finalPos: THREE.Vector3 | undefined
    let finalRot = fileRotation
    if (current3DFileType === "dxf" && addDxf) {
      const info = addDxf.getDxf(current3DFileId)
      if (info) {
        finalPos = info.group.position.clone()
        finalRot = THREE.MathUtils.radToDeg(info.group.rotation.y)
      }
      addDxf.confirmPlacement(current3DFileId)
    } else if (current3DFileType === "model" && modelManager) {
      const info = modelManager.getModel(current3DFileId)
      if (info) {
        finalPos = info.model.position.clone()
        finalRot = THREE.MathUtils.radToDeg(info.model.rotation.y)
      }
      modelManager.toggleGizmo(current3DFileId, false)
    }
    if (selectedFile && finalPos) void uploadPlacedFile(selectedFile, finalPos, finalRot)

    setShow3DScaleCard(false)
    setCurrent3DFileId(null)
    setCurrent3DFileType(null)
    setFileRotation(0)
    setFileScale(1)
    setSelectedFile(null)
    setIsPlacingFile(false)
    setCursor("")
    toast.dismiss('place-bim-file-toast')
    toolsDispatch({ type: "CLEAR-TOOLS" })
  }, [current3DFileId, current3DFileType, addDxf, modelManager, selectedFile, fileRotation, uploadPlacedFile, setCursor, toolsDispatch])

  // Real-time scale/rotation updates while the placement card is open.
  React.useEffect(() => {
    if (!current3DFileId || !show3DScaleCard || !current3DFileType) return
    if (current3DFileType === "dxf" && addDxf) {
      addDxf.updateScale(current3DFileId, fileScale)
      addDxf.updateRotation(current3DFileId, fileRotation)
    } else if (current3DFileType === "model" && modelManager) {
      modelManager.setScale(current3DFileId, fileScale)
      modelManager.setRotation(current3DFileId, new THREE.Euler(0, THREE.MathUtils.degToRad(fileRotation), 0))
    }
  }, [fileScale, fileRotation, current3DFileId, show3DScaleCard, current3DFileType, addDxf, modelManager])

  // Markers follow their object every frame and hide while that object's gizmo is active.
  React.useEffect(() => {
    if (!world || markerCount === 0) return
    let raf = 0
    const worldPos = new THREE.Vector3()
    const tick = () => {
      placedFilesRef.current.forEach((placed) => {
        if (!placed.marker) return
        placed.object3D.getWorldPosition(worldPos)
        placed.marker.position.set(worldPos.x, worldPos.y + 0.2, worldPos.z)
        const editing = placed.kind === "dxf"
          ? !!addDxf?.getDxf(placed.id)?.gizmoController
          : placed.kind === "model"
            ? !!modelManager?.getModel(placed.id)?.gizmoController
            : false
        placed.marker.visible = !editing
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [world, addDxf, modelManager, markerCount])

  const getPlacedFile = React.useCallback((id: string): PlacedFile | undefined => {
    return placedFilesRef.current.get(id)
  }, [])

  const editPlacedFile = React.useCallback((id: string, mode: GizmoMode = "translate") => {
    const placed = placedFilesRef.current.get(id)
    if (!placed) return
    if (placed.kind === "dxf" && addDxf) {
      addDxf.toggleGizmo(id, true)
      addDxf.setGizmoMode(id, mode)
    } else if (placed.kind === "model" && modelManager) {
      modelManager.toggleGizmo(id, true)
      modelManager.getModel(id)?.gizmoController?.setMode(mode)
    }
  }, [addDxf, modelManager])

  const removePlacedFile = React.useCallback((id: string) => {
    const placed = placedFilesRef.current.get(id)
    if (!placed) return
    if (placed.kind === "dxf") addDxf?.removeDxf(id)
    else if (placed.kind === "model") modelManager?.remove(id)
    else if (world) world.scene.three.remove(placed.object3D)
    removeMarker(placed.marker, world)
    placedFilesRef.current.delete(id)
    setMarkerCount(c => Math.max(0, c - 1))
  }, [addDxf, modelManager, world])

  return {
    selectedFile,
    mousePosition,
    isPlacingFile,
    fileScale,
    fileRotation,
    show3DScaleCard,
    current3DFileType,
    setFileScale,
    setFileRotation,
    handleFileSelect,
    handleFileDrop,
    cancelPlacement,
    confirmPlacement,
    setCursor,
    raycast,
    getPlacedFile,
    editPlacedFile,
    removePlacedFile,
  }
}
