// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'
import * as THREE from 'three'

import { useDeleteFile, useFile } from '../../../../../../../../hooks/files/files'
import { BimContext, BuildingsContext, MenusContext, ToolsContext } from '../../../../../../../../store'
import ConfirmDialog from '../../../../../../../ConfirmDialog'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { useFileDeleteHandler, FileItemComponent, useFileActions } from '../../../../../../../ui/FilesManager'
import { BCFTopicsManager } from '../../../../BCFTopicsManager'
import { CurrentWorld } from '../../../../CurrentWorld'
import { Cursor } from '../../../../Cursor'
import { DXFManager } from '../../../../DXFLoader'
import { Highlighter } from '../../../../Highlighter'
import { IDSManager } from '../../../../IDSManager'
import { needsMarker } from '../../../../lib/needsMarker'
import { isFileInScene, sceneObjectForFile } from '../../../../lib/sceneContent'
import { selectSceneSeedFiles } from '../../../../lib/sceneSeed'
import { ModelManager } from '../../../../ModelManager'
import { AnimationSession } from '../../../../Placement/AnimationSession'
import { markerActionsFor } from '../../../../Placement/markerActions'
import { capabilitiesForFile } from '../../../../Placement/placementCapabilities'
import { PlacementEditor } from '../../../../Placement/PlacementEditor'
import { objectTarget } from '../../../../Placement/targets/objectTarget'
import { usePlacementSession } from '../../../../Placement/usePlacementSession'
import { BimSceneObjects } from '../../../../SceneObjects'
import { createFileMarker, removeMarker, type AddedFile } from '../../../../tools/AddToBim/src/FileMarkerUtils'

import type { DbFile as IFile } from '../../../../../../../../types/dbTypes'
import type { PlacementMode } from '../../../../Placement/PlacementEditor'
import type { SceneObject } from '../../../../SceneObjects'
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

const PLACE_TOAST_ID = 'bim-file-place-toast'

const placedPosition = (file: IFile): THREE.Vector3 =>
  file.x != null && file.y != null && file.z != null
    ? new THREE.Vector3(file.x as number, file.y as number, file.z as number)
    : new THREE.Vector3()

export function FilesSection({ files, query = '' }: FilesSectionProps) {
  const t = useTranslations('FileSelection')

  const { state: bimState, dispatch: bimDispatch } = React.useContext(BimContext)
  const { bimComponents, fragments, world } = bimState.bim
  const { state: buildingsState } = React.useContext(BuildingsContext)
  const { building } = buildingsState.buildings
  const buildingId = building?.id || -1
  const { dispatch: menusDispatch } = React.useContext(MenusContext)
  const { dispatch: toolsDispatch } = React.useContext(ToolsContext)

  const { deleteFile } = useDeleteFile(buildingId)

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
      // The record seeds a placeable file; after that the scene is the truth.
      const inScene = (file: IFile): boolean => {
        if (file.extension === 'ids') return activeIDSFileId === file.id
        if (!isPlaceable(file.extension)) return false

        return isFileInScene(file, registryRef.current) || (file as any).isVisible === true
      }
      return files
        .filter(file => file.tag !== 'user')
        .filter(file => (file as any).type !== 'map-file')
        .map(file => {
          // A tracked file keeps the user's toggle; a first-seen one asks the scene.
          let isVisible = visibilityMap.has(file.id) ? visibilityMap.get(file.id)! : inScene(file)
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

  const dxfManager = React.useMemo(() => {
    if (!bimComponents) return null
    try { return bimComponents.get(DXFManager) } catch { return null }
  }, [bimComponents])

  const registry = React.useMemo(() => {
    if (!bimComponents) return null
    try { return bimComponents.get(BimSceneObjects).registry } catch { return null }
  }, [bimComponents, world])
  const registryRef = React.useRef(registry)
  React.useEffect(() => { registryRef.current = registry }, [registry])

  // Floating scene markers (pin + actions card) for visible placeable files.
  const markersRef = React.useRef<Map<string, { marker: CSS2DObject; file: IFile }>>(new Map())
  // Bumped after an object finishes loading so the marker reconcile effect re-runs.
  const [loadedTick, setLoadedTick] = React.useState(0)

  // Anyone may put an object in the scene; the list follows it rather than being told twice.
  React.useEffect(() => {
    if (!registry) return
    const track = (visible: boolean) => (entry: SceneObject) => {
      setLoadedTick(tick => tick + 1)
      // A pin standing in for a PDF is in the scene, but the list has no visibility to report.
      if (!entry.fileId || entry.kind === 'marker') return
      setLocalFiles(prev => prev.map(f =>
        f.id.toString() === entry.fileId ? { ...f, isVisible: visible } : f))
    }
    const stopAdded = registry.onAdded(track(true))
    const stopRemoved = registry.onRemoved(track(false))
    return () => { stopAdded(); stopRemoved() }
  }, [registry])

  const toggleModelVisibility = React.useCallback(async (
    file: IFile,
    visible: boolean,
    position?: THREE.Vector3,
  ) => {
    if (!modelManager || !registry) return

    const key = file.id.toString()
    if (!visible) { registry.setVisible(key, false); return }

    const existing = registry.get(key)
    if (existing) {
      registry.setVisible(key, true)
      if (position) existing.root.position.copy(position)
      return
    }

    try {
      const res = await fetch(`/api/presignedUrlDownload/${file.id}`)
      if (!res.ok) throw new Error(`Failed to get download URL: ${res.status}`)
      const { presignedUrl } = await res.json()
      const info = await modelManager.load(presignedUrl, key, file.name, {
        position: position ?? placedPosition(file),
        rotation: file.bimRotation != null ? new THREE.Euler(0, file.bimRotation, 0) : undefined,
        extension: file.extension ?? undefined,
      })
      if (info) {
        registry.add({ key, fileId: key, kind: 'model', root: info.model, dispose: () => { modelManager.remove(key) } })
      }
    } catch (err) {
      console.error(`[FilesSection] Failed to load model "${file.name}":`, err)
    }
  }, [modelManager, registry])

  const toggleDxfVisibility = React.useCallback(async (file: IFile, visible: boolean) => {
    if (!dxfManager || !registry) return

    const key = file.id.toString()
    if (!visible) { registry.setVisible(key, false); return }
    if (registry.has(key)) { registry.setVisible(key, true); return }

    try {
      const res = await fetch(`/api/presignedUrlDownload/${file.id}`)
      if (!res.ok) throw new Error(`Failed to get download URL: ${res.status}`)
      const { presignedUrl } = await res.json()
      const group = await dxfManager.parse(presignedUrl)
      const placed = file.x != null && file.y != null && file.z != null
      group.position.copy(placed
        ? new THREE.Vector3(file.x as number, file.y as number, file.z as number)
        : new THREE.Vector3())
      group.scale.setScalar(0.001)
      if (file.bimRotation != null) group.rotation.y = file.bimRotation as number
      registry.add({ key, fileId: key, kind: 'dxf', root: group })
    } catch (err) {
      console.error(`[FilesSection] Failed to load DXF "${file.name}":`, err)
    }
  }, [dxfManager, registry])

  // Keyed on the building id, not unmount: closing the sidebar tab must not empty the scene.
  const loadedBuildingRef = React.useRef<number | null>(null)
  React.useEffect(() => {
    if (loadedBuildingRef.current === buildingId) return
    const previous = loadedBuildingRef.current
    loadedBuildingRef.current = buildingId
    if (previous === null) return

    registry?.clear()
  }, [buildingId, registry])

  // Claimed per building so a revalidation cannot re-add what the user just switched off.
  const seededBuildingRef = React.useRef<number | null>(null)
  React.useEffect(() => {
    if (!registry || !modelManager || files.length === 0) return
    if (seededBuildingRef.current === buildingId) return
    seededBuildingRef.current = buildingId

    for (const file of selectSceneSeedFiles(files as IFile[], isPlaceable, key => registry.has(key))) {
      void (file.extension?.toLowerCase() === 'dxf'
        ? toggleDxfVisibility(file, true)
        : toggleModelVisibility(file, true))
    }
  }, [buildingId, files, registry, modelManager, toggleModelVisibility, toggleDxfVisibility])

  // Read by the marker rAF loop, so it hides the marker of whatever is being placed.
  const placingIdRef = React.useRef<string | null>(null)

  // Track the file ID currently being repositioned so useFile can provide updateFile
  const [moveFileId, setMoveFileId] = React.useState<number | null>(null)
  const placementSession = usePlacementSession()
  React.useEffect(() => {
    placingIdRef.current = placementSession?.id ?? null
    if (!placementSession) setMoveFileId(null)
  }, [placementSession])
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

    if (is3DFile(file.extension)) {
      await toggleModelVisibility(file, newVisibility)
      if (fragments) void fragments.core.update(true)
    }

    // DXF files managed via DXFManager
    if (file.extension === 'dxf') {
      await toggleDxfVisibility(file, newVisibility)
      if (fragments) void fragments.core.update(true)
    }
  }, [bimComponents, menusDispatch, bimState, bimDispatch, fragments, toggleModelVisibility, toggleDxfVisibility])

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
    toast.info(t('placeHint', { name: placingFile.name }), { id: PLACE_TOAST_ID, duration: Infinity })

    const mouse = new THREE.Vector2()

    const handleDblClick = async (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY

      const result = await raycast({
        camera: world.camera.three,
        mouse,
        dom: world.renderer!.three.domElement!,
      })

      // A click that hit nothing carries no position, so the object lands at the origin.
      const { x, y, z } = result?.point ?? new THREE.Vector3()
      setMoveFileId(placingFile.id)
      // Save coordinates to DB
      setTimeout(() => {
        updateFileRef.current({ x, y, z } as any)
          .catch((err: unknown) => console.error(`Failed to save placement for "${placingFile.name}":`, err))
      }, 50)
      if (is3DFile(placingFile.extension)) {
        void toggleModelVisibility(placingFile, true, new THREE.Vector3(x, y, z))
      }
      // Update local state so it shows as placed and visible
      placingFile.x = x
      placingFile.y = y
      placingFile.z = z
      setLocalFiles(prev => prev.map(f => f.id === placingFile.id ? { ...f, x, y, z, isVisible: true } : f))
      setPlacingFile(null)
      if (cursor) cursor.cursor = ''
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
      toast.dismiss(PLACE_TOAST_ID)
    }
  }, [placingFile, bimComponents, raycast, t, toggleModelVisibility])

  const getSceneObject = React.useCallback((file: IFile): THREE.Object3D | null => {
    return sceneObjectForFile(file, registryRef.current)
  }, [])

  const editObject = React.useCallback((file: IFile, mode: PlacementMode = 'translate') => {
    if (!bimComponents) return
    if (!getSceneObject(file)) return

    setMoveFileId(file.id)
    void bimComponents.get(PlacementEditor).begin(objectTarget({
      id: file.id.toString(),
      name: file.name,
      object: () => getSceneObject(file),
      updateFile: async (patch) => {
        Object.assign(file, patch)
        await updateFileRef.current(patch as never)
      },
      capabilities: capabilitiesForFile(file),
    }), mode)
  }, [bimComponents, getSceneObject])

  // Move handler: unplaced files → click-to-place; placed files → gizmo (load DXF first if needed)
  const handleBimMove = React.useCallback((file: IFile) => {
    const isPlaced = file.x != null && file.y != null && file.z != null
    if (!isPlaced) {
      setPlacingFile(file)
      setMoveFileId(file.id)
      return
    }
    if (!registry?.has(file.id.toString())) {
      const load = file.extension === 'dxf'
        ? toggleDxfVisibility(file, true)
        : toggleModelVisibility(file, true)
      void load.then(() => editObject(file, 'translate'))
      return
    }
    editObject(file, 'translate')
  }, [editObject, registry, toggleDxfVisibility, toggleModelVisibility])

  const { handleAction, deleteDialog } = useFileActions({
    files: localFiles,
    setFiles: setLocalFiles,
    buildingId,
    handleDeleteFile,
    onView: handleBimView,
    shouldPersistVisibility: (file) => isPlaceable(file.extension),
    onMove: handleBimMove,
    onDelete: (file) => { registry?.remove(file.id.toString()) },
  })

  // AddToBim owns adding: crosshair on file choice, and the upload carries the placement.
  const addFile = React.useCallback(() => {
    toolsDispatch({ type: 'SET-TOOL', payload: { currentToolId: 'bim-add-file' } })
  }, [toolsDispatch])

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
        if (is3DFile(f.extension)) await toggleModelVisibility(f, checked)
        else if (f.extension === 'dxf') await toggleDxfVisibility(f, checked)
      }
      if (fragments) void fragments.core.update(true)
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
      const clips = modelManager?.getClips(file.id.toString()) ?? []
      const marker = createFileMarker(makeMarkerInput(file, obj.position.clone()), obj, world, (action) => {
        if (action === 'delete') { void handleAction('delete', file); return }
        if (action === 'animate') {
          bimComponents.get(AnimationSession).begin({ fileId: file.id.toString(), name: file.name })
          return
        }
        editObject(file, action === 'move' ? 'translate' : action)
      }, markerActionsFor(capabilitiesForFile(file), { animated: clips.length > 0 }))
      if (marker) markersRef.current.set(key, { marker, file })
    }
  }, [localFiles, loadedTick, bimComponents, getSceneObject, editObject, handleAction, makeMarkerInput, modelManager])

  // Markers follow their object; one only earns its place when the geometry is too small to hit.
  React.useEffect(() => {
    if (!bimComponents) return
    let raf = 0
    const worldPos = new THREE.Vector3()
    const tick = () => {
      const world = bimComponents.get(CurrentWorld).world
      const camera = world?.camera?.three
      const viewportHeight = world?.renderer?.three.domElement.clientHeight ?? 0

      markersRef.current.forEach(({ marker, file }, key) => {
        const obj = getSceneObject(file)
        if (!obj) { marker.visible = false; return }
        obj.getWorldPosition(worldPos)
        marker.position.set(worldPos.x, worldPos.y + 0.2, worldPos.z)
        marker.visible = placingIdRef.current !== key
          && !!camera
          && needsMarker(obj, camera, viewportHeight)
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
        onAddItem={addFile}
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
