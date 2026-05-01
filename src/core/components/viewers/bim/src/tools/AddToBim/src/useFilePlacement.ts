"use client"

import * as React from "react"
import * as THREE from "three"
import * as OBC from "@thatopen/components"
import { toast } from "sonner"
import { ModelManager } from "../../../ModelManager"
import { Highlighter } from "../../../Highlighter"
import { Cursor } from "../../../Cursor"
import { AddDxf } from "./AddDxf"
import { addFileToScene } from "./FileHandler"
import type { AddedFile } from "./FileMarkerUtils"
import type { BimToolbarToolsType } from "../../bimToolbar"
import { getFileExtension } from "../../../../../../../utils/utils"

export function useFilePlacement(
  bimComponents: OBC.Components | null,
  world: OBC.World | null,
  fragments: OBC.FragmentsManager | null,
  toolsDispatch: React.Dispatch<any>,
  buildingId: number,
  uploadFileToDB?: (args: { fileData: any; buildingId: number }) => Promise<any>,
) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [addedFiles, setAddedFiles] = React.useState<AddedFile[]>([])
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 })
  const [isPlacingFile, setIsPlacingFile] = React.useState(false)

  const [fileScale, setFileScale] = React.useState(1)
  const [fileRotation, setFileRotation] = React.useState(0)
  const [confirmed3DFiles, setConfirmed3DFiles] = React.useState<Set<string>>(new Set())
  const [show3DScaleCard, setShow3DScaleCard] = React.useState(false)
  const [current3DFileId, setCurrent3DFileId] = React.useState<string | null>(null)
  const [current3DFileType, setCurrent3DFileType] = React.useState<"dxf" | "model" | null>(null)

  // Managers
  const [modelManager, setModelManager] = React.useState<ModelManager | null>(null)
  const [addDxf, setAddDxf] = React.useState<AddDxf | null>(null)

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
    if (!addDxf) {
      const dxfUtility = new AddDxf(bimComponents, world)
      setAddDxf(dxfUtility)
    }
  }, [bimComponents, world, modelManager, addDxf])

  const setCursor = React.useCallback((cursor: string) => {
    if (!bimComponents) return
    const currentCursor = bimComponents.get(Cursor)
    if (!currentCursor) return
    currentCursor.cursor = cursor as any
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

    await Promise.all(results)
    if (results.length === 0) return null

    let closestResult = results[0]
    let minDistance = closestResult.distance
    for (let i = 1; i < results.length; i++) {
      if (results[i].distance < minDistance) {
        minDistance = results[i].distance
        closestResult = results[i]
      }
    }

    return closestResult
  }, [fragments, highlighter])

  const processFileObject = React.useCallback((file: File, addingMode: BimToolbarToolsType) => {
    const fileName = file.name.toLowerCase()

    if (addingMode === "bim-add-cad") {
      if (!fileName.endsWith(".dxf")) {
        alert("Please select a valid CAD file (.dxf)")
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
    toast.info(`Double-click on the model to place: "${file.name}"`, {
      id: 'place-bim-file-toast',
      duration: Infinity,
    })
  }, [setCursor])

  const handleFileSelect = React.useCallback((event: React.ChangeEvent<HTMLInputElement>, addingMode: BimToolbarToolsType) => {
    const file = event.target.files?.[0]
    if (!file) return
    processFileObject(file, addingMode)
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

  // Handle file placement on double-click
  React.useEffect(() => {
    if (!selectedFile || !bimComponents || !world || !isPlacingFile) return

    const mouse = new THREE.Vector2()

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
      mouse.x = e.clientX
      mouse.y = e.clientY
    }

    const handleDblClick = async (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY

      const result = await raycast({
        camera: world.camera.three,
        mouse,
        dom: world.renderer!.three.domElement!,
      })

      if (result?.point && (result.point.x !== 0 || result.point.y !== 0 || result.point.z !== 0)) {
        const newAddedFile: AddedFile = {
          id: Date.now().toString(),
          file: selectedFile,
          position: result.point.clone(),
          imageUrl: selectedFile.type.startsWith("image/")
            ? URL.createObjectURL(selectedFile)
            : undefined,
        }

        setAddedFiles(prev => [...prev, newAddedFile])
        await addFileToScene(
          newAddedFile, fileScale, fileRotation,
          world, modelManager, addDxf, toolsDispatch, setCurrent3DFileId,
        )

        // Upload the file to the database with its 3D position
        if (uploadFileToDB && buildingId > 0) {
          try {
            const fileId = crypto.randomUUID()
            const presignedResponse = await fetch(`/api/presigned-url-upload?asset=${fileId}`)
            if (presignedResponse.ok) {
              const { presignedUrl } = await presignedResponse.json()
              await fetch(presignedUrl, {
                method: "PUT",
                body: selectedFile,
                headers: { "Content-Type": selectedFile.type },
              })
              await uploadFileToDB({
                fileData: {
                  name: selectedFile.name,
                  type: "bim-file",
                  mimeType: selectedFile.type,
                  extension: getFileExtension(selectedFile),
                  sizeBytes: selectedFile.size,
                  tag: "file",
                  uploadedAt: new Date().toISOString(),
                  url: "",
                  assetId: fileId,
                  description: "",
                  attachedFilesBuildingId: buildingId,
                  isVisible: true,
                  x: result.point.x,
                  y: result.point.y,
                  z: result.point.z,
                },
                buildingId,
              })
            }
          } catch (err) {
            console.error("Error uploading file to database:", err)
          }
        }

        const fileName = selectedFile.name.toLowerCase()
        const is3DFile = fileName.endsWith(".dxf") || fileName.endsWith(".glb") || fileName.endsWith(".gltf")

        if (is3DFile) {
          setIsPlacingFile(false)
          setCursor("")
        } else {
          cancelPlacement()
        }
      }

      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("dblclick", handleDblClick)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("dblclick", handleDblClick)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("dblclick", handleDblClick)
    }
  }, [selectedFile, bimComponents, world, isPlacingFile, fileScale, fileRotation, modelManager, addDxf, toolsDispatch, raycast, cancelPlacement, setCursor])

  const confirmPlacement = React.useCallback(() => {
    if (!selectedFile || addedFiles.length === 0 || !current3DFileId) return

    const latest3DFile = addedFiles.findLast(f => {
      const name = f.file.name.toLowerCase()
      return name.endsWith(".dxf") || name.endsWith(".glb") || name.endsWith(".gltf")
    })

    if (latest3DFile) {
      if (current3DFileType === "dxf" && addDxf) {
        addDxf.confirmPlacement(current3DFileId)
      } else if (current3DFileType === "model" && modelManager) {
        modelManager.toggleGizmo(current3DFileId, false)
      }
      setConfirmed3DFiles(prev => new Set(prev).add(latest3DFile.id))
    }

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
  }, [selectedFile, addedFiles, current3DFileId, current3DFileType, addDxf, modelManager, setCursor, toolsDispatch])

  // Real-time scale/rotation updates for 3D files
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

  return {
    selectedFile,
    addedFiles,
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
  }
}
