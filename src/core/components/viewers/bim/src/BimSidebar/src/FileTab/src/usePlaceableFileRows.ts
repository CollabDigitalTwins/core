'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { toast } from 'sonner'
import * as THREE from 'three'

import { useFile } from '../../../../../../../../hooks/files/files'
import { BimContext } from '../../../../../../../../store'
import { EXTENSIONS_FOR_TYPE } from '../../../../../../../ui/FilesManager/src/fileType'
import { CurrentWorld } from '../../../../CurrentWorld'
import { Cursor } from '../../../../Cursor'
import { DXFManager } from '../../../../DXFLoader'
import { Highlighter } from '../../../../Highlighter'
import { isFileInScene, sceneObjectForFile } from '../../../../lib/sceneContent'
import { selectSceneSeedFiles } from '../../../../lib/sceneSeed'
import { ModelManager } from '../../../../ModelManager'
import { capabilitiesForFile } from '../../../../Placement/placementCapabilities'
import { PlacementEditor } from '../../../../Placement/PlacementEditor'
import { objectTarget } from '../../../../Placement/targets/objectTarget'
import { usePlacementSession } from '../../../../Placement/usePlacementSession'
import { BimSceneObjects } from '../../../../SceneObjects'

import type { DbFile } from '../../../../../../../../types/dbTypes'
import type { PlacementMode } from '../../../../Placement/PlacementEditor'
import type { SceneObject, SceneObjectRegistry } from '../../../../SceneObjects'

const is3DFile = (extension?: string | null): boolean =>
  EXTENSIONS_FOR_TYPE['3d-file'].includes(extension?.toLowerCase() ?? '')

type Row = DbFile & { isVisible?: boolean }

// Returning the previous array unchanged keeps a caller that rebuilds `files` out of a render loop.
const sameRow = (a: Row, b: Row): boolean => {
  const keys = Object.keys(a) as (keyof Row)[]
  return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key])
}

const PLACE_TOAST_ID = 'bim-file-place-toast'

const placedPosition = (file: DbFile): THREE.Vector3 =>
  file.x != null && file.y != null && file.z != null
    ? new THREE.Vector3(file.x as number, file.y as number, file.z as number)
    : new THREE.Vector3()

export interface PlaceableRowsOptions {
  files: DbFile[]
  buildingId: number | null | undefined
  isPlaceable: (extension?: string | null) => boolean
  placeHint: (name: string) => string
}

export interface PlaceableRows {
  rows: (DbFile & { isVisible?: boolean })[]
  setRows: React.Dispatch<React.SetStateAction<(DbFile & { isVisible?: boolean })[]>>
  toggleVisibility: (file: DbFile, visible: boolean, position?: THREE.Vector3) => Promise<void>
  handleMove: (file: DbFile) => void
  registry: SceneObjectRegistry | null
  registryRef: React.RefObject<SceneObjectRegistry | null>
  getSceneObject: (file: DbFile) => THREE.Object3D | null
  editObject: (file: DbFile, mode?: PlacementMode) => void
  placingIdRef: React.RefObject<string | null>
  loadedTick: number
}

/** Scene sync, seeding, click-to-place and gizmo edit shared by 3D models and CAD drawings. */
export function usePlaceableFileRows({
  files,
  buildingId,
  isPlaceable,
  placeHint,
}: PlaceableRowsOptions): PlaceableRows {
  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents, fragments, world } = bimState.bim

  const [rows, setRows] = React.useState<(DbFile & { isVisible?: boolean })[]>([])

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

  // A tracked row keeps whatever the user last toggled; a first-seen one asks the scene.
  React.useEffect(() => {
    setRows(previous => {
      const tracked = new Map(previous.map(row => [row.id, row.isVisible]))
      const next = files
        .map(file => ({
          ...file,
          isVisible: tracked.get(file.id)
            ?? (isPlaceable(file.extension)
              && (isFileInScene(file, registryRef.current) || file.isVisible === true)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      const unchanged = next.length === previous.length
        && next.every((row, index) => sameRow(row, previous[index]))
      return unchanged ? previous : next
    })
  }, [files, isPlaceable])

  // Bumped after an object finishes loading so the marker reconcile effect re-runs.
  const [loadedTick, setLoadedTick] = React.useState(0)

  // Anyone may put an object in the scene; the list follows it rather than being told twice.
  React.useEffect(() => {
    if (!registry) return
    const track = (visible: boolean) => (entry: SceneObject) => {
      setLoadedTick(tick => tick + 1)
      // A pin standing in for a PDF is in the scene, but the list has no visibility to report.
      if (!entry.fileId || entry.kind === 'marker') return
      setRows(prev => prev.map(f =>
        f.id.toString() === entry.fileId ? { ...f, isVisible: visible } : f))
    }
    const stopAdded = registry.onAdded(track(true))
    const stopRemoved = registry.onRemoved(track(false))
    return () => { stopAdded(); stopRemoved() }
  }, [registry])

  const toggleModelVisibility = React.useCallback(async (
    file: DbFile,
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

  const toggleDxfVisibility = React.useCallback(async (file: DbFile, visible: boolean) => {
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

  const toggleVisibility = React.useCallback(async (
    file: DbFile,
    visible: boolean,
    position?: THREE.Vector3,
  ) => {
    if (file.extension?.toLowerCase() === 'dxf') { await toggleDxfVisibility(file, visible); return }
    await toggleModelVisibility(file, visible, position)
  }, [toggleDxfVisibility, toggleModelVisibility])

  React.useEffect(() => {
    registry?.resetForBuilding(buildingId)
  }, [buildingId, registry])

  // Claimed per building so a revalidation cannot re-add what the user just switched off.
  const seededBuildingRef = React.useRef<number | null>(null)
  React.useEffect(() => {
    if (buildingId == null) return
    if (!registry || !modelManager || files.length === 0) return
    if (seededBuildingRef.current === buildingId) return
    seededBuildingRef.current = buildingId

    for (const file of selectSceneSeedFiles(files, isPlaceable, key => registry.has(key))) {
      void (file.extension?.toLowerCase() === 'dxf'
        ? toggleDxfVisibility(file, true)
        : toggleModelVisibility(file, true))
    }
  }, [buildingId, files, registry, modelManager, isPlaceable, toggleModelVisibility, toggleDxfVisibility])

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
  const [placingFile, setPlacingFile] = React.useState<DbFile | null>(null)

  // Click-to-place effect: crosshair + double-click raycast for unplaced files
  React.useEffect(() => {
    if (!placingFile || !bimComponents) return

    const world = bimComponents.get(CurrentWorld).world
    if (!world) return

    const cursor = bimComponents.get(Cursor)
    if (cursor) cursor.cursor = 'crosshair'
    toast.info(placeHint(placingFile.name), { id: PLACE_TOAST_ID, duration: Infinity })

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
      setRows(prev => prev.map(f => f.id === placingFile.id ? { ...f, x, y, z, isVisible: true } : f))
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
  }, [placingFile, bimComponents, raycast, placeHint, toggleModelVisibility])

  const getSceneObject = React.useCallback((file: DbFile): THREE.Object3D | null => {
    return sceneObjectForFile(file, registryRef.current)
  }, [])

  const editObject = React.useCallback((file: DbFile, mode: PlacementMode = 'translate') => {
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
  const handleMove = React.useCallback((file: DbFile) => {
    const isPlaced = file.x != null && file.y != null && file.z != null
    if (!isPlaced) {
      setPlacingFile(file)
      setMoveFileId(file.id)
      return
    }
    if (!registry?.has(file.id.toString())) {
      const load = file.extension?.toLowerCase() === 'dxf'
        ? toggleDxfVisibility(file, true)
        : toggleModelVisibility(file, true)
      void load.then(() => editObject(file, 'translate'))
      return
    }
    editObject(file, 'translate')
  }, [editObject, registry, toggleDxfVisibility, toggleModelVisibility])

  return {
    rows,
    setRows,
    toggleVisibility,
    handleMove,
    registry,
    registryRef,
    getSceneObject,
    editObject,
    placingIdRef,
    loadedTick,
  }
}
