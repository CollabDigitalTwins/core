// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import * as THREE from 'three'

import { useUploadFileToBuilding, useDeleteFile, useFile } from '../../../../../../../../hooks/files/files'
import { BimContext, BuildingsContext, MenusContext } from '../../../../../../../../store'
import ConfirmDialog from '../../../../../../../ConfirmDialog'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { useFileUploadHandler, useFileDeleteHandler, FileItemComponent, useFileActions, useCommonFileUpload } from '../../../../../../../ui/FilesManager'
import { GizmoController } from '../../../../../utils/GizmoController'
import { BCFTopicsManager } from '../../../../BCFTopicsManager'
import { CurrentWorld } from '../../../../CurrentWorld'
import { Cursor } from '../../../../Cursor'
import { DXFManager } from '../../../../DXFLoader'
import { Highlighter } from '../../../../Highlighter'
import { IDSManager } from '../../../../IDSManager'
import { ModelManager } from '../../../../ModelManager'
import { createFileMarker, removeMarker, type AddedFile } from '../../../../tools/AddToBim/src/FileMarkerUtils'

import type { DbFile as IFile } from '../../../../../../../../types/dbTypes'
import type { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'

// Hoist options arrays so the array identity is stable across renders.
// Inline `options={[...]}` defeats React.memo on FileItemComponent.
type FileAction = import('../../../../../../../../types/global').FileAction
const OPTIONS_3D: FileAction[] = ['download', 'view', 'move', 'info', 'delete']
const OPTIONS_NON_3D: FileAction[] = ['download', 'view', 'delete']

interface FilesSectionProps {
  files: IFile[]
  query?: string
}

const is3DFile = (ext?: string | null): boolean => {
  if (!ext) return false
  return ['glb', 'gltf', 'fbx', 'obj', 'collada'].includes(ext.toLowerCase())
}

// Files that live in the 3D scene and can be moved/scaled (3D models + DXF drawings).
const isPlaceable = (ext?: string | null): boolean => is3DFile(ext) || ext?.toLowerCase() === 'dxf'

export function FilesSection({ files, query = '' }: FilesSectionProps) {
  const t = useTranslations('FileSelection')

  const { state: bimState, dispatch: bimDispatch } = React.useContext(BimContext)
  const { bimComponents, fragments } = bimState.bim
  const { state: buildingsState } = React.useContext(BuildingsContext)
  const { building } = buildingsState.buildings
  const buildingId = building?.id || -1
  const { dispatch: menusDispatch } = React.useContext(MenusContext)

  const { uploadFile } = useUploadFileToBuilding(buildingId)
  const { deleteFile } = useDeleteFile(buildingId)

  const { handleFileUpload } = useFileUploadHandler({
    buildingId,
    tag: 'file',
    uploadFile,
  })

  const { handleDeleteFile } = useFileDeleteHandler({
    deleteFile,
  })

  // Local state for file management with isVisible property
  const [localFiles, setLocalFiles] = React.useState<(IFile & { isVisible?: boolean })[]>([])
  const [activeIDSFileId, setActiveIDSFileId] = React.useState<number | null>(null)

  // Initialize and sync files
  React.useEffect(() => {
    setLocalFiles(prevFiles => {
      const visibilityMap = new Map(
        prevFiles.map(f => [f.id, f.isVisible ?? false])
      )
      // A file is "visible" only if it's actually present and shown in the 3D scene
      // (a loaded model, a loaded DXF group, or the active IDS). This mirrors the Map
      // viewer, which derives visibility from on-scene state (mapFileIds) rather than
      // from the persisted `file.isVisible` flag — so nothing shows as visible on open
      // unless it has been toggled on or just placed/added into the scene.
      const isFileInScene = (file: IFile): boolean => {
        if (file.extension === 'ids') return activeIDSFileId === file.id
        if (file.extension === 'dxf') {
          return dxfGroupsRef.current.get(file.id.toString())?.visible === true
        }
        if (is3DFile(file.extension)) {
          const info = modelManagerRef.current?.getModelByName(file.name)
          return info ? info.model.visible !== false : false
        }
        return false
      }
      return files
        .filter(file => file.tag !== 'user')
        .filter(file => (file as any).type !== 'map-file')
        .map(file => {
          // Preserve the user's in-session toggle for already-tracked files; for files
          // seen for the first time, derive visibility from the actual scene state.
          let isVisible = visibilityMap.has(file.id) ? visibilityMap.get(file.id)! : isFileInScene(file)
          if (file.extension === 'ids' && activeIDSFileId === file.id) {
            isVisible = true
          } else if (file.extension === 'ids' && activeIDSFileId !== null && activeIDSFileId !== file.id) {
            isVisible = false
          }
          return { ...file, isVisible }
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    })
  }, [files, activeIDSFileId])

  // Listen to IDS reset events
  React.useEffect(() => {
    if (!bimComponents) return
    try {
      const idsManager = bimComponents.get(IDSManager)
      const handleIDSReset = () => {
        setActiveIDSFileId(null)
        setLocalFiles(prevFiles =>
          prevFiles.map(file =>
            file.extension === 'ids' ? { ...file, isVisible: false } : file
          )
        )
      }
      idsManager.onReset.add(handleIDSReset)
      return () => { idsManager.onReset.remove(handleIDSReset) }
    } catch {
      return
    }
  }, [bimComponents])

  const modelManager = React.useMemo(() => {
    if (!bimComponents) return null
    try { return bimComponents.get(ModelManager) } catch { return null }
  }, [bimComponents])
  const modelManagerRef = React.useRef(modelManager)
  React.useEffect(() => { modelManagerRef.current = modelManager }, [modelManager])

  const dxfManager = React.useMemo(() => {
    if (!bimComponents) return null
    try { return bimComponents.get(DXFManager) } catch { return null }
  }, [bimComponents])
  // Loaded DXF groups keyed by file id, so visibility toggles can show/hide them.
  const dxfGroupsRef = React.useRef<Map<string, THREE.Group>>(new Map())

  // Floating scene markers (pin + actions card) for visible placeable files.
  const markersRef = React.useRef<Map<string, { marker: CSS2DObject; file: IFile }>>(new Map())
  // Bumped after an object finishes loading so the marker reconcile effect re-runs.
  const [loadedTick, setLoadedTick] = React.useState(0)

  const toggleDxfVisibility = React.useCallback(async (file: IFile, visible: boolean) => {
    if (!dxfManager || !bimComponents) return
    const world = bimComponents.get(CurrentWorld).world
    if (!world) return

    const key = file.id.toString()
    const existing = dxfGroupsRef.current.get(key)
    if (visible) {
      if (existing) { existing.visible = true; return }
      try {
        const res = await fetch(`/api/presignedUrlDownload/${file.id}`)
        if (!res.ok) throw new Error(`Failed to get download URL: ${res.status}`)
        const { presignedUrl } = await res.json()
        const group = await dxfManager.parse(presignedUrl)
        group.name = key
        const placed = file.x != null && file.y != null && file.z != null
        group.position.copy(placed
          ? new THREE.Vector3(file.x as number, file.y as number, file.z as number)
          : new THREE.Vector3())
        group.scale.setScalar(0.001)
        if (file.bimRotation != null) group.rotation.y = file.bimRotation as number
        world.scene.three.add(group)
        dxfGroupsRef.current.set(key, group)
        setLoadedTick(t => t + 1)
      } catch (err) {
        console.error(`[FilesSection] Failed to load DXF "${file.name}":`, err)
      }
    } else if (existing) {
      existing.visible = false
    }
  }, [dxfManager, bimComponents])

  // Gizmo controllers keyed by file name (one gizmo per file at most)
  const gizmoControllersRef = React.useRef<Map<string, GizmoController>>(new Map())

  // Track the file ID currently being repositioned so useFile can provide updateFile
  const [moveFileId, setMoveFileId] = React.useState<number | null>(null)
  const { updateFile } = useFile(moveFileId)
  const updateFileRef = React.useRef(updateFile)
  React.useEffect(() => { updateFileRef.current = updateFile }, [updateFile])

  const fetchDbFileAsFile = async (file: IFile): Promise<globalThis.File> => {
    const response = await fetch(file.url)
    const blob = await response.blob()
    const mimeType = file.extension === 'ids' ? 'application/xml' : 'application/octet-stream'
    return new globalThis.File([blob], file.name, { type: mimeType })
  }

  // View handler: IDS, BCF, and 3D file visibility
  const handleBimView = React.useCallback(async (file: IFile & { isVisible?: boolean }, newVisibility: boolean) => {
    // IDS files
    if (file.extension === 'ids') {
      const idsManager = bimComponents?.get(IDSManager)
      if (!idsManager) return
      idsManager.enabled = newVisibility
      if (newVisibility) {
        setActiveIDSFileId(file.id)
        try {
          const dbFile = await fetchDbFileAsFile(file)
          await idsManager.loadFromFile(dbFile)
          await idsManager.loadAndTestIDS()
        } catch (error) {
          console.error('Error loading IDS file:', error)
        }
      } else {
        setActiveIDSFileId(null)
        await idsManager.reset()
      }
    }

    // BCF files
    if (file.extension === 'bcf') {
      menusDispatch({ type: 'SET_SIDEBAR_SELECTED_TAB', payload: { selectedTab: 'communication' } })
      if (!bimComponents) return
      let bcfManager: BCFTopicsManager | undefined
      try {
        bcfManager = bimComponents.get(BCFTopicsManager)
      } catch {
        bcfManager = new BCFTopicsManager(bimComponents)
      }
      if (!bcfManager) return
      try {
        const { topics } = await bcfManager.loadBCFFromUrl(file.url)
        if (topics?.length) {
          topics.forEach((topic) => {
            const exists = bimState.bim.bcfTopics.find(t => t.guid === topic.guid)
            if (!exists) {
              bimDispatch({ type: 'ADD_BCF_TOPIC', payload: { bcfTopic: topic } })
            }
          })
        }
      } catch (error) {
        console.error('Failed to load BCF from URL:', error)
      }
    }

    // 3D model files (GLB/GLTF/FBX/OBJ) managed by ModelManager
    if (is3DFile(file.extension) && modelManager) {
      const existingModel = modelManager.getModelByName(file.name)
      if (newVisibility) {
        if (existingModel) {
          // Already in scene — just show it
          existingModel.model.visible = true
        } else {
          // Not yet loaded — get a fresh presigned download URL then load
          try {
            const res = await fetch(`/api/presignedUrlDownload/${file.id}`)
            if (!res.ok) throw new Error(`Failed to get download URL: ${res.status}`)
            const { presignedUrl } = await res.json()
            const position = (file.x != null && file.y != null && file.z != null)
              ? new THREE.Vector3(file.x as number, file.y as number, file.z as number)
              : new THREE.Vector3(0, 0, 0)
            const rotation = file.bimRotation != null
              ? new THREE.Euler(0, file.bimRotation, 0)
              : undefined
            await modelManager.load(presignedUrl, file.id.toString(), file.name, {
              position,
              rotation,
              extension: file.extension ?? undefined,
            })
          } catch (err) {
            console.error(`[FilesSection] Failed to load model "${file.name}":`, err)
          }
        }
      } else {
        if (existingModel) {
          existingModel.model.visible = false
        }
      }
      if (fragments) void fragments.core.update(true)
    }

    // DXF files managed via DXFManager
    if (file.extension === 'dxf') {
      await toggleDxfVisibility(file, newVisibility)
      if (fragments) void fragments.core.update(true)
    }
    setLoadedTick(t => t + 1)
  }, [bimComponents, menusDispatch, bimState, bimDispatch, modelManager, fragments, toggleDxfVisibility])

  const highlighter = React.useMemo(() => {
    if (!bimComponents) return null
    try { return bimComponents.get(Highlighter) } catch { return null }
  }, [bimComponents])

  // Raycast into fragments (same logic as useFilePlacement)
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
    let closest = results[0]
    for (let i = 1; i < results.length; i++) {
      if (results[i].distance < closest.distance) closest = results[i]
    }
    return closest
  }, [fragments, highlighter])

  // Track the file currently being placed (unplaced file → click-to-place)
  const [placingFile, setPlacingFile] = React.useState<IFile | null>(null)

  // Click-to-place effect: crosshair + double-click raycast for unplaced files
  React.useEffect(() => {
    if (!placingFile || !bimComponents) return

    const world = bimComponents.get(CurrentWorld).world
    if (!world) return

    const cursor = bimComponents.get(Cursor)
    if (cursor) cursor.cursor = 'crosshair'

    const mouse = new THREE.Vector2()

    const handleDblClick = async (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY

      const result = await raycast({
        camera: world.camera.three,
        mouse,
        dom: world.renderer!.three.domElement!,
      })

      if (result?.point && (result.point.x !== 0 || result.point.y !== 0 || result.point.z !== 0)) {
        const { x, y, z } = result.point
        setMoveFileId(placingFile.id)
        // Save coordinates to DB
        setTimeout(() => {
          updateFileRef.current({ x, y, z } as any)
            .catch((err: unknown) => console.error(`Failed to save placement for "${placingFile.name}":`, err))
        }, 50)
        // Load model into scene at the placed position (for 3D files)
        if (is3DFile(placingFile.extension) && modelManagerRef.current) {
          const existing = modelManagerRef.current.getModelByName(placingFile.name)
          if (!existing) {
            fetch(`/api/presignedUrlDownload/${placingFile.id}`)
              .then(res => res.ok ? res.json() : Promise.reject(new Error(`Presigned URL request failed with status ${res.status}`)))
              .then(({ presignedUrl }) =>
                modelManagerRef.current!.load(
                  presignedUrl,
                  placingFile.id.toString(),
                  placingFile.name,
                  { position: new THREE.Vector3(x, y, z), extension: placingFile.extension ?? undefined },
                )
              )
              .catch((err: unknown) => console.error(`Failed to load model "${placingFile.name}":`, err))
          } else {
            existing.model.position.set(x, y, z)
            existing.model.visible = true
          }
        }
        // Update local state so it shows as placed and visible
        placingFile.x = x
        placingFile.y = y
        placingFile.z = z
        setLocalFiles(prev => prev.map(f => f.id === placingFile.id ? { ...f, x, y, z, isVisible: true } : f))
        setPlacingFile(null)
        if (cursor) cursor.cursor = ''
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPlacingFile(null)
        if (cursor) cursor.cursor = ''
      }
    }

    const onDblClick = (e: MouseEvent) => { void handleDblClick(e) }

    document.addEventListener('dblclick', onDblClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('dblclick', onDblClick)
      document.removeEventListener('keydown', handleKeyDown)
      if (cursor) cursor.cursor = ''
    }
  }, [placingFile, bimComponents, raycast])

  // Resolve the scene object for a file (loaded 3D model or DXF group), if present.
  const getSceneObject = React.useCallback((file: IFile): THREE.Object3D | null => {
    if (file.extension === 'dxf') return dxfGroupsRef.current.get(file.id.toString()) ?? null
    return modelManager?.getModelByName(file.name)?.model ?? null
  }, [modelManager])

  // Attach a transform gizmo to a placed object (or re-set its mode); saves on accept.
  const editObject = React.useCallback((file: IFile, mode: 'translate' | 'rotate' | 'scale' = 'translate') => {
    if (!bimComponents) return
    const world = bimComponents.get(CurrentWorld).world
    if (!world) return
    const obj = getSceneObject(file)
    if (!obj) return

    const key = file.id.toString()
    const existing = gizmoControllersRef.current.get(key)
    if (existing) { existing.setMode(mode); return }

    const gizmo = new GizmoController(world)
    const cleanup = (save: boolean) => {
      if (save) {
        const { x, y, z } = obj.position
        const rotation = obj.rotation.y
        updateFileRef.current({ x, y, z, bimRotation: rotation } as any)
          .catch((err: unknown) => console.error(`Failed to save position for "${file.name}":`, err))
        file.x = x; file.y = y; file.z = z; file.bimRotation = rotation
      }
      gizmoControllersRef.current.delete(key)
      setMoveFileId(null)
    }
    gizmo.onAccept = () => cleanup(true)
    gizmo.onCancel = () => cleanup(false)
    gizmo.setMode(mode)
    setMoveFileId(file.id)
    gizmo.attach(obj)
    gizmoControllersRef.current.set(key, gizmo)
  }, [bimComponents, getSceneObject])

  // Move handler: unplaced files → click-to-place; placed files → gizmo (load DXF first if needed)
  const handleBimMove = React.useCallback((file: IFile) => {
    const isPlaced = file.x != null && file.y != null && file.z != null
    if (!isPlaced) {
      setPlacingFile(file)
      setMoveFileId(file.id)
      return
    }
    if (file.extension === 'dxf' && !dxfGroupsRef.current.has(file.id.toString())) {
      void toggleDxfVisibility(file, true).then(() => editObject(file, 'translate'))
      return
    }
    editObject(file, 'translate')
  }, [editObject, toggleDxfVisibility])

  const { handleAction, deleteDialog } = useFileActions({
    files: localFiles,
    setFiles: setLocalFiles,
    buildingId,
    handleDeleteFile,
    onView: handleBimView,
    onMove: handleBimMove,
  })

  const { handleAddFile } = useCommonFileUpload({
    buildingId,
    acceptedFileTypes: '*',
    handleFileUpload: async (domFile: globalThis.File) => {
      await handleFileUpload(domFile)
    },
    onUploadError: (error) => {
      console.error('Error uploading file:', error)
    },
  })

  const filteredFiles = React.useMemo(() => {
    if (!query.trim()) return localFiles
    return localFiles.filter(file =>
      file.name.toLowerCase().includes(query.toLowerCase())
    )
  }, [localFiles, query])

  const areAllHidden = localFiles.every(f => !f.isVisible)

  const handleSwitchVariant = () => ({
    checked: !areAllHidden,
    onCheckedChange: async (checked: boolean) => {
      setLocalFiles(prev => prev.map(f => ({ ...f, isVisible: checked })))
      for (const f of localFiles) {
        if (is3DFile(f.extension) && modelManager) {
          const existingModel = modelManager.getModelByName(f.name)
          if (checked) {
            if (existingModel) {
              existingModel.model.visible = true
            } else {
              try {
                const res = await fetch(`/api/presignedUrlDownload/${f.id}`)
                if (res.ok) {
                  const { presignedUrl } = await res.json()
                  const position = (f.x != null && f.y != null && f.z != null)
                    ? new THREE.Vector3(f.x as number, f.y as number, f.z as number)
                    : new THREE.Vector3(0, 0, 0)
                  await modelManager.load(presignedUrl, f.id.toString(), f.name, {
                    position,
                    extension: f.extension ?? undefined,
                  })
                }
              } catch (err) {
                console.error(`[FilesSection] Failed to load model "${f.name}":`, err)
              }
            }
          } else if (existingModel) {
            existingModel.model.visible = false
          }
        } else if (f.extension === 'dxf') {
          await toggleDxfVisibility(f, checked)
        }
      }
      if (fragments) void fragments.core.update(true)
      setLoadedTick(t => t + 1)
    },
  })

  // createFileMarker expects an AddedFile; build a lightweight one from the DB file.
  const makeMarkerInput = React.useCallback((file: IFile, position: THREE.Vector3): AddedFile => ({
    id: file.id.toString(),
    file: new File([], file.name, { type: (file as any).mimeType ?? '' }),
    position,
  }), [])

  // Reconcile floating markers with the visible + loaded placeable files.
  React.useEffect(() => {
    if (!bimComponents) return
    const world = bimComponents.get(CurrentWorld).world
    if (!world) return

    const wanted = new Map(
      localFiles
        .filter(f => f.isVisible && isPlaceable(f.extension))
        .map(f => [f.id.toString(), f] as const),
    )

    for (const [key, entry] of markersRef.current) {
      if (!wanted.has(key)) {
        removeMarker(entry.marker, world)
        markersRef.current.delete(key)
      }
    }

    for (const [key, file] of wanted) {
      if (markersRef.current.has(key)) continue
      const obj = getSceneObject(file)
      if (!obj) continue // not loaded yet — picked up once loadedTick bumps
      const marker = createFileMarker(makeMarkerInput(file, obj.position.clone()), obj, world, (action) => {
        if (action === 'delete') { void handleAction('delete', file); return }
        editObject(file, action === 'move' ? 'translate' : action)
      })
      if (marker) markersRef.current.set(key, { marker, file })
    }
  }, [localFiles, loadedTick, bimComponents, getSceneObject, editObject, handleAction, makeMarkerInput])

  // Markers follow their object each frame and hide while that object's gizmo is active.
  React.useEffect(() => {
    if (!bimComponents) return
    let raf = 0
    const worldPos = new THREE.Vector3()
    const tick = () => {
      markersRef.current.forEach(({ marker, file }, key) => {
        const obj = getSceneObject(file)
        if (!obj) { marker.visible = false; return }
        obj.getWorldPosition(worldPos)
        marker.position.set(worldPos.x, worldPos.y + 0.2, worldPos.z)
        marker.visible = !gizmoControllersRef.current.has(key)
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [bimComponents, getSceneObject])

  // Clean up all markers on unmount so their DOM/React roots don't leak.
  const markersCleanupRef = React.useRef(markersRef.current)
  React.useEffect(() => {
    const markers = markersCleanupRef.current
    return () => {
      markers.forEach(({ marker }) => removeMarker(marker))
      markers.clear()
    }
  }, [])

  return (
    <>
      <CollapsibleSection
        title={t('filesTitle')}
        icon={LR.FileText}
        className="max-h-40 overflow-y-auto"
        itemCount={filteredFiles.length}
        switchVariant={handleSwitchVariant()}
        onAddItem={handleAddFile}
        addItemTitle={t('addFileTitle')}
      >
        <div className="space-y-1">
          {filteredFiles.map((item) => (
            <FileItemComponent
              key={item.id}
              file={item}
              onAction={handleAction}
              options={isPlaceable(item.extension) ? OPTIONS_3D : OPTIONS_NON_3D}
              translationKey="FileSelection"
              confirmDelete={false}
            />
          ))}
        </div>
      </CollapsibleSection>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        isDeleting={deleteDialog.isDeleting}
        onOpenChange={deleteDialog.onOpenChange}
        handleConfirm={deleteDialog.onConfirm}
        itemName={deleteDialog.itemName}
      />
    </>
  )
}
