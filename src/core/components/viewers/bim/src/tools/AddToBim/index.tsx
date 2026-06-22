"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react"
import * as LR from "lucide-react"
import Image from "next/image"
import { useTranslations } from 'next-intl'

import { BuildingsContext, MenusContext, ToolsContext } from "../../../../../../store"
import { BimContext } from "../../../../../../store/BIM/context"
import { ViewerNames } from "../../../../../../types/dbTypes"
import type { Tool, ToolbarToolType } from "../../../../../../types/tools"
import type { BimToolbarToolsType } from "../bimToolbar"
import { Button, useSidebar } from "../../../../../ui"

import { initializeCSS2DRenderer } from "./src/FileMarkerUtils"
import { useCommentMarkers } from "./src/useCommentMarkers"
import { useSensorMarkers } from "./src/useSensorMarkers"
import { useFilePlacement } from "./src/useFilePlacement"
import { AddToBimToolbar } from "./src/AddToBimToolbar"
import Position3DCard from "./src/Position3DCard"
import { FileAdderDialog } from "../../../../map/src/tools/AddTools/AddFile/FileAdder"
import { CommentInput } from "../../../../../ui/Comments/CommentInput"
import { SensorInput } from "../../../../../ui/Sensors/SensorInput"
import { useFilesByBuildingId, useUploadFileToBuilding, useDeleteFile } from "../../../../../../hooks/files/files"
import { ViewerContextMenu } from "../../../../../ui/FilesManager"
import type { FileMarkerAction } from "../../../../../ui/FilesManager/src/FileMarker"
import type { DbFile } from "../../../../../../types/dbTypes"
import type { FileAction } from "../../../../../../types/global"

interface AddToBimProps {
  tool: Tool
}

const FilePreview: React.FC<{
  file: File
  mousePosition: { x: number; y: number }
}> = ({ file, mousePosition }) => {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null)
  const isImage = file.type.startsWith("image/")

  React.useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file, isImage])

  return (
    <Button
      variant="outline"
      size="sm"
      className="fixed pointer-events-none z-[9999] bg-white/95 flex items-center gap-2 cursor-crosshair text-xs"
      style={{ left: mousePosition.x + 10, top: mousePosition.y - 10 }}
    >
      {isImage && imageUrl ? (
        <Image src={imageUrl} alt={file.name} width={16} height={16} className="object-cover rounded" />
      ) : (
        <LR.File size={16} className="text-black" />
      )}
      <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1">{file.name}</span>
    </Button>
  )
}

export default function AddToBim({ tool }: AddToBimProps) {
  const t = useTranslations('AddToBim')
  const { dispatch: toolsDispatch, state: toolsState } = React.useContext(ToolsContext)
  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents, world, fragments } = bimState.bim
  const { state: buildingState } = React.useContext(BuildingsContext)
  const buildingId = buildingState?.buildings?.building?.id || -1
  const { dispatch: menusDispatch } = React.useContext(MenusContext)
  const { setOpenInfo } = useSidebar()

  const [addingMode, setAddingMode] = React.useState<BimToolbarToolsType>(null)

  // Context menu state for right-click on BIM scene objects
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; file: DbFile } | null>(null)

  // Extracted hooks
  const { addPendingComment, removePendingComment, commentCount } = useCommentMarkers(world, buildingId)
  const { addPendingSensor, removePendingSensor, sensorCount } = useSensorMarkers(world, buildingId)
  const { uploadFile } = useUploadFileToBuilding(buildingId)
  const { deleteFile } = useDeleteFile(buildingId)

  // Visible (added-to-scene) non-BIM files; also used to resolve a marker to its DB record.
  const filesData = useFilesByBuildingId(buildingId).files || []
  const filesDataRef = React.useRef(filesData)
  filesDataRef.current = filesData
  const visibleFileCount = filesData.filter(f => {
    const ext = f.extension?.toLowerCase()
    return ext !== "ifc" && ext !== "frag" && f.tag !== "user" && f.tag !== "bim-file" && f.isVisible
  }).length

  // Marker actions reach into the placement API after it is created, so route through a ref.
  const placementRef = React.useRef<ReturnType<typeof useFilePlacement> | null>(null)
  const handleMarkerAction = React.useCallback((id: string, action: FileMarkerAction) => {
    const api = placementRef.current
    if (!api) return
    if (action === "delete") {
      const placed = api.getPlacedFile(id)
      api.removePlacedFile(id)
      const dbFile = placed
        ? filesDataRef.current.find(f => f.name === placed.name && (f.id ?? 0) > 0)
        : undefined
      if (dbFile?.id) deleteFile(dbFile.id).catch(() => { })
      return
    }
    api.editPlacedFile(id, action === "move" ? "translate" : action)
  }, [deleteFile])

  const filePlacement = useFilePlacement(
    bimComponents, world, fragments, toolsDispatch, buildingId, uploadFile,
    handleMarkerAction,
  )
  placementRef.current = filePlacement

  // Initialize CSS2D renderer
  React.useEffect(() => {
    if (world) initializeCSS2DRenderer(world)
  }, [world])

  // Canvas-level right-click: raycast to detect hit, show context menu
  React.useEffect(() => {
    if (!world || !fragments) return
    const canvas = world.renderer?.three?.domElement
    if (!canvas) return

    const handleContextMenu = async (e: MouseEvent) => {
      // Prevent the browser default menu immediately, regardless of what we hit
      e.preventDefault()

      const mouse = new (await import("three")).Vector2(e.clientX, e.clientY)
      const result = await filePlacement.raycast({
        camera: world.camera.three,
        mouse,
        dom: canvas,
      })

      // Try to identify which file was hit by matching model names in fragments
      const hitModelId = (result as any)?.modelId ?? (result as any)?.fragments?.modelId
      const matchedFile = hitModelId
        ? filesDataRef.current.find(f => f.name === hitModelId)
        : null

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        file: matchedFile ?? { id: 0, name: t('bimObject'), url: "", type: "bim-file" } as DbFile,
      })
    }

    canvas.addEventListener("contextmenu", handleContextMenu)
    return () => canvas.removeEventListener("contextmenu", handleContextMenu)
  }, [world, fragments, filePlacement.raycast])

  // Allow other UI to trigger AddToBim modes via currentToolId
  const { currentToolId } = toolsState.tools
  React.useEffect(() => {
    const bimAddModes: BimToolbarToolsType[] = [
      "bim-add-file", "bim-add-comment", "bim-add-ids",
      "bim-add-ifc", "bim-add-bcf", "bim-add-cad", "bim-add-sensor",
    ]
    if (bimAddModes.includes(currentToolId as BimToolbarToolsType)) {
      setAddingMode(currentToolId as BimToolbarToolsType)
    }
  }, [currentToolId])

  const startAdding = React.useCallback((mode: BimToolbarToolsType) => {
    setAddingMode(mode)
    toolsDispatch({ type: "SET-TOOL", payload: { currentToolId: mode } })
    // Crosshair is set by useFilePlacement.handleFileSelect after the user picks a file,
    // not here — so the cursor stays normal while the file picker is open.
  }, [toolsDispatch])

  const cancelAdding = React.useCallback(() => {
    setAddingMode(null)
    filePlacement.cancelPlacement()
  }, [filePlacement])

  // Sidebar navigation callbacks
  const openFileTab = React.useCallback(() => {
    setOpenInfo(true)
    menusDispatch({ type: "SET_SIDEBAR_SELECTED_TAB", payload: { selectedTab: "file" } })
  }, [setOpenInfo, menusDispatch])

  const openCommentsTab = React.useCallback(() => {
    setOpenInfo(true)
    menusDispatch({ type: "SET_SIDEBAR_SELECTED_TAB", payload: { selectedTab: "communication" } })
  }, [setOpenInfo, menusDispatch])

  const openSensorsTab = React.useCallback(() => {
    setOpenInfo(true)
    menusDispatch({ type: "SET_SIDEBAR_SELECTED_TAB", payload: { selectedTab: "sensors" } })
  }, [setOpenInfo, menusDispatch])

  const handleContextMenuAction = React.useCallback((_action: FileAction, _file: DbFile) => {
    openFileTab()
  }, [openFileTab])

  return (
    <>
      {/* File preview tooltip following cursor during placement */}
      {filePlacement.selectedFile && filePlacement.isPlacingFile && (
        <FilePreview file={filePlacement.selectedFile} mousePosition={filePlacement.mousePosition} />
      )}

      {/* Toolbar submenu */}
      <AddToBimToolbar
        tool={tool}
        onStartFile={() => startAdding("bim-add-file")}
        onStartComment={() => startAdding("bim-add-comment")}
        onStartCAD={() => startAdding("bim-add-cad")}
        onStartSensor={() => startAdding("bim-add-sensor")}
        fileCount={visibleFileCount}
        commentCount={commentCount}
        sensorCount={sensorCount}
        onFileBadgeClick={openFileTab}
        onCommentBadgeClick={openCommentsTab}
        onSensorBadgeClick={openSensorsTab}
      />

      {/* 3D position/scale card for DXF/GLB placement */}
      {filePlacement.show3DScaleCard && filePlacement.selectedFile && filePlacement.current3DFileType && (
        <Position3DCard
          fileType={filePlacement.current3DFileType}
          fileName={filePlacement.selectedFile.name}
          scale={filePlacement.fileScale}
          rotation={filePlacement.fileRotation}
          onScaleChange={filePlacement.setFileScale}
          onRotationChange={filePlacement.setFileRotation}
          onConfirm={() => {
            filePlacement.confirmPlacement()
            setAddingMode(null)
          }}
          onCancel={cancelAdding}
        />
      )}

      {/* File input card */}
      {addingMode === "bim-add-file" && !filePlacement.show3DScaleCard && (
        <FileAdderDialog
          isOpen={true}
          onClose={cancelAdding}
          title={t('addFile')}
          icon={LR.FilePlus}
          accept="*/*"
          onFileSelect={(e) => filePlacement.handleFileSelect(e, addingMode)}
          onFileDrop={(file) => filePlacement.handleFileDrop(file, addingMode)}
          dropZoneTitle={t('dropZoneTitle')}
          dropZoneSubtext={t('dropZoneSubtext')}
          hide={filePlacement.isPlacingFile && !!filePlacement.selectedFile}
        />
      )}

      {addingMode === "bim-add-cad" && !filePlacement.show3DScaleCard && (
        <FileAdderDialog
          isOpen={true}
          onClose={cancelAdding}
          title={t('addCadFile')}
          icon={LR.DraftingCompass}
          accept=".dxf,.dwg"
          onFileSelect={(e) => filePlacement.handleFileSelect(e, addingMode)}
          onFileDrop={(file) => filePlacement.handleFileDrop(file, addingMode)}
          dropZoneTitle={t('dropZoneTitleCad')}
          dropZoneSubtext={t('dropZoneSubtextCad')}
          hide={filePlacement.isPlacingFile && !!filePlacement.selectedFile}
        />
      )}

      {/* Comment input */}
      <CommentInput
        viewer={ViewerNames.bim}
        layout="dialog"
        isOpen={addingMode === "bim-add-comment"}
        onCancel={cancelAdding}
        bim={{
          world,
          raycast: filePlacement.raycast,
          buildingId,
          setCursor: filePlacement.setCursor,
          addPendingMarker: addPendingComment,
          removePendingMarker: removePendingComment,
        }}
      />

      {/* Sensor input */}
      <SensorInput
        viewer={ViewerNames.bim}
        layout="dialog"
        isOpen={addingMode === "bim-add-sensor"}
        onCancel={cancelAdding}
        bim={{
          world,
          raycast: filePlacement.raycast,
          buildingId,
          setCursor: filePlacement.setCursor,
          addPendingMarker: addPendingSensor,
          removePendingMarker: removePendingSensor,
        }}
      />

      {/* Right-click context menu on BIM scene objects */}
      {contextMenu && (
        <ViewerContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          options={['view', 'move', 'delete']}
          onAction={handleContextMenuAction}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}
