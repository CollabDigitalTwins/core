// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import * as THREE from 'three'

import { useDeleteFile } from '../../../../../../../../hooks/files/files'
import { BimContext, BuildingsContext, MenusContext, ToolsContext } from '../../../../../../../../store'
import ConfirmDialog from '../../../../../../../ConfirmDialog'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { useFileDeleteHandler, FileItemComponent, useFileActions } from '../../../../../../../ui/FilesManager'
import { BCFTopicsManager } from '../../../../BCFTopicsManager'
import { CurrentWorld } from '../../../../CurrentWorld'
import { IDSManager } from '../../../../IDSManager'
import { needsMarker } from '../../../../lib/needsMarker'
import { isFileInScene } from '../../../../lib/sceneContent'
import { ModelManager } from '../../../../ModelManager'
import { AnimationSession } from '../../../../Placement/AnimationSession'
import { markerActionsFor } from '../../../../Placement/markerActions'
import { capabilitiesForFile } from '../../../../Placement/placementCapabilities'
import { createFileMarker, removeMarker, type AddedFile } from '../../../../tools/AddToBim/src/FileMarkerUtils'

import { usePlaceableFileRows } from './usePlaceableFileRows'

import type { DbFile as IFile } from '../../../../../../../../types/dbTypes'
import type { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'

// Hoisted so identity is stable — inline `options={[...]}` defeats React.memo on FileItemComponent.
type FileAction = import('../../../../../../../../types/global').FileAction
const OPTIONS_3D: FileAction[] = ['download', 'view', 'move', 'info', 'delete']
const OPTIONS_NON_3D: FileAction[] = ['download', 'view', 'delete']

interface FilesSectionProps {
  files: IFile[]
  query?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const is3DFile = (ext?: string | null): boolean => {
  if (!ext) return false
  return ['glb', 'gltf', 'fbx', 'obj', 'collada'].includes(ext.toLowerCase())
}

// Files that live in the 3D scene and can be moved/scaled (3D models + DXF drawings).
const isPlaceable = (ext?: string | null): boolean => is3DFile(ext) || ext?.toLowerCase() === 'dxf'

export function FilesSection({ files, query = '', open, onOpenChange }: FilesSectionProps) {
  const t = useTranslations('FileSelection')

  const { state: bimState, dispatch: bimDispatch } = React.useContext(BimContext)
  const { bimComponents, fragments } = bimState.bim
  const { state: buildingsState } = React.useContext(BuildingsContext)
  const { building } = buildingsState.buildings
  const buildingId = building?.id || -1
  const { dispatch: menusDispatch } = React.useContext(MenusContext)
  const { dispatch: toolsDispatch } = React.useContext(ToolsContext)

  const { deleteFile } = useDeleteFile(buildingId)

  const { handleDeleteFile } = useFileDeleteHandler({
    deleteFile,
  })

  const isDxfPlaceable = React.useCallback((extension?: string | null) => extension?.toLowerCase() === 'dxf', [])
  const placeHint = React.useCallback((name: string) => t('placeHint', { name }), [t])

  const {
    rows: localFiles,
    setRows: setLocalFiles,
    toggleVisibility,
    handleMove: handleBimMove,
    registry,
    registryRef,
    getSceneObject,
    editObject,
    placingIdRef,
    loadedTick,
  } = usePlaceableFileRows({
    files,
    buildingId,
    isPlaceable: isDxfPlaceable,
    placeHint,
  })
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

  // Floating scene markers (pin + actions card) for visible placeable files.
  const markersRef = React.useRef<Map<string, { marker: CSS2DObject; file: IFile }>>(new Map())

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

    if (isPlaceable(file.extension)) {
      await toggleVisibility(file, newVisibility)
      if (fragments) void fragments.core.update(true)
    }
  }, [bimComponents, menusDispatch, bimState, bimDispatch, fragments, toggleVisibility])

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
        if (isPlaceable(f.extension)) await toggleVisibility(f, checked)
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
        className="min-h-0 overflow-y-auto"
        style={{ height: '100%', minHeight: 0 }}
        itemCount={filteredFiles.length}
        switchVariant={handleSwitchVariant()}
        onAddItem={addFile}
        addItemTitle={t('addFileTitle')}
        open={open}
        onOpenChange={onOpenChange}
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
