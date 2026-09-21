'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { Marker } from 'react-map-gl/maplibre'

import { useFile, useFiles, useDeleteFile } from '../../../../../../../hooks/files/files'
import { FilesContext, MapContext } from '../../../../../../../store'
import { markerOcclusionProps } from '../../../../../../../utils/markerUtils'

import ConfirmDialog from '../../../../../../ConfirmDialog'
import { downloadDbFile } from '../../../../../../ui/FilesManager'
import { AnimationPanel } from '../../../../../shared/placement/AnimationPanel'
import { MapPlacementHost } from '../../../Placement/MapPlacementHost'
import { MapPlacementMenu } from '../../../Placement/MapPlacementMenu'
import { PlaceOnMap } from '../PlaceOnMap'

import MapFileManager from './components/MapFileManager'
import MapFileMarker from './components/MapFileMarker'
import { FileModelLayer } from './FileModelLayer/FileModelLayer'
import { openPopupWindow } from './utils/openFileInPopUpWindow'

import type { ModelAnimationControls } from './utils/CustomModelLayer'
import type { DbFile } from '../../../../../../../types/dbTypes'
import type { FileAction } from '../../../../../../../types/global'
import type { FileMarkerAction } from '../../../../../../ui/FilesManager/src/PlacementActionsCard'
import type { AnimationState } from '../../../../../shared/placement/modelAnimation'
import type { PlacementMode } from '../../../../../shared/placement/placementTarget'


const is3DModelFile = (extension?: string | null): boolean => {
  if (!extension) return false
  return ['glb', 'gltf', 'fbx', 'obj', 'collada'].includes(extension.toLowerCase())
}

const isHiddenFileType = (extension?: string | null): boolean => {
  if (!extension) return false
  const ext = extension.toLowerCase()
  return ext === 'frag' || ext === 'ifc'
}

const shouldExcludeByTag = (tag?: string | null): boolean => {
  if (!tag) return false
  return tag === 'user' || tag === 'bim-file' || tag === 'fragment-file' || tag === 'bimModel'
}

// ── Per-marker component — fetches its own file data via useFile(id) ──────────
interface FileMarkerItemProps {
  id: number
  editingFileId?: number
  onContextMenu: (e: React.MouseEvent, file: DbFile) => void
}

const FileMarkerItem = React.memo(({ id, editingFileId, onContextMenu }: FileMarkerItemProps) => {
  const { file } = useFile(id)

  if (!file) return null
  if (file.id === editingFileId) return null
  if (is3DModelFile(file.extension) || isHiddenFileType(file.extension) || shouldExcludeByTag(file.tag)) return null
  if (!file.lat || !file.lng) return null

  return (
    <Marker latitude={file.lat} longitude={file.lng} {...markerOcclusionProps}>
      <div onContextMenu={e => onContextMenu(e, file)}>
        <MapFileMarker
          mimeType={file.mimeType}
          extension={file.extension}
          url={file.url}
          onDbClick={() => openPopupWindow(file)}
        />
      </div>
    </Marker>
  )
})
FileMarkerItem.displayName = 'FileMarkerItem'

// ── Main layer ────────────────────────────────────────────────────────────────
export const FileLayers = () => {
  const { state: fileState, dispatch: fileDispatch } = React.useContext(FilesContext)
  const { mapFileIds, isMapFileManagerOpen, editingFile } = fileState.files
  const { state: mapState } = React.useContext(MapContext)
  const { map } = mapState.map

  const handleMapRepaint = React.useCallback(() => {
    map?.triggerRepaint()
  }, [map])

  const tempPositionsRef = React.useRef<Record<string, { lat: number; lng: number }>>({})
  const tempRotationsRef = React.useRef<Record<string, number>>({})
  const tempElevationsRef = React.useRef<Record<string, number>>({})
  const tempScalesRef = React.useRef<Record<string, number>>({})
  const editingFileIdRef = React.useRef<string | null>(null)
  const [editMode, setEditMode] = React.useState<PlacementMode>('translate')

  React.useEffect(() => {
    editingFileIdRef.current = editingFile ? String(editingFile.id) : null
  }, [editingFile])

  const handleExitEditFileMode = React.useCallback(() => {
    fileDispatch({ type: 'EDIT_FILE', payload: { file: null } })
  }, [fileDispatch])

  // Sync SWR files into the store (for FileModelLayer and other consumers)
  const { files, isLoading, isError } = useFiles()
  React.useEffect(() => {
    if (isLoading || isError) return
    fileDispatch({ type: 'SET_FILES', payload: { files } })
  }, [files, isLoading, isError])

  const { deleteFile } = useDeleteFile()

  const [contextMenu, setContextMenu] = React.useState<
    { x: number; y: number; file: DbFile; animation?: ModelAnimationControls } | null
  >(null)
  const [animating, setAnimating] = React.useState<
    { file: DbFile; controls: ModelAnimationControls; state: AnimationState } | null
  >(null)
  const [pendingDelete, setPendingDelete] = React.useState<DbFile | null>(null)

  const tAnimation = useTranslations('Animation')
  const animationLabels = React.useMemo(() => ({
    title: tAnimation('title'),
    clip: tAnimation('clip'),
    play: tAnimation('play'),
    pause: tAnimation('pause'),
    speed: tAnimation('speed'),
    notSaved: tAnimation('notSaved'),
  }), [tAnimation])

  const updateAnimation = React.useCallback((change: (controls: ModelAnimationControls) => void) => {
    setAnimating(current => {
      if (!current) return current
      change(current.controls)
      const state = current.controls.getAnimation()
      return state ? { ...current, state } : current
    })
  }, [])

  const handleContextMenu = React.useCallback((e: React.MouseEvent, file: DbFile) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, file })
  }, [])

  const handleContextMenuAction = React.useCallback((action: FileAction, file: DbFile) => {
    if (action === 'view') {
      const isOnMap = mapFileIds.includes(file.id)
      fileDispatch({
        type: isOnMap ? 'REMOVE_FROM_MAP' : 'ADD_TO_MAP',
        payload: { id: file.id },
      })
    }
    else if (action === 'move') {
      fileDispatch({ type: 'EDIT_FILE', payload: { file } })
    }
    else if (action === 'download') {
      void downloadDbFile(file)
    }
    else if (action === 'delete') {
      // Optimistically remove from local state, then delete from DB
      fileDispatch({ type: 'REMOVE_FILE', payload: { id: file.id } })
      deleteFile(file.id).catch(err => {
        // Re-add to store on failure so the UI stays consistent
        console.error('Failed to delete file:', err)
        fileDispatch({ type: 'ADD_FILE', payload: { file } })
      })
    }
  }, [fileDispatch, mapFileIds, deleteFile])

  const handlePlacementMenuAction = React.useCallback((action: FileMarkerAction) => {
    const file = contextMenu?.file
    setContextMenu(null)
    if (!file) return

    if (action === 'move' || action === 'rotate' || action === 'scale') {
      setEditMode(action === 'move' ? 'translate' : action)
      fileDispatch({ type: 'EDIT_FILE', payload: { file } })
      return
    }

    if (action === 'delete') {
      setPendingDelete(file)
      return
    }

    if (action === 'animate') {
      const controls = contextMenu?.animation
      const state = controls?.getAnimation()
      if (controls && state) setAnimating({ file, controls, state })
      return
    }

    handleContextMenuAction(action as FileAction, file)
  }, [contextMenu, fileDispatch, handleContextMenuAction])

  return (
    <>
      <FileModelLayer
        tempPositionsRef={tempPositionsRef}
        editingFileIdRef={editingFileIdRef}
        tempRotationsRef={tempRotationsRef}
        tempElevationsRef={tempElevationsRef}
        tempScalesRef={tempScalesRef}
        onContextMenu={(file, x, y, animation) => setContextMenu({ x, y, file, animation })}
      />

      {mapFileIds.map(id => (
        <FileMarkerItem
          key={id}
          id={id}
          editingFileId={editingFile?.id}
          onContextMenu={handleContextMenu}
        />
      ))}

      {editingFile && (() => {
        if (editingFile.lat == null || editingFile.lng == null) {
          return (
            <PlaceOnMap
              file={editingFile}
              onPlaced={(file, lat, lng) => {
                fileDispatch({ type: 'UPDATE_FILE_COORDS', payload: { id: file.id, lat, lng, type: 'map-file' } })
                fileDispatch({ type: 'ADD_TO_MAP', payload: { id: file.id } })
                fileDispatch({ type: 'EDIT_FILE', payload: { file: null } })
              }}
              onCancel={handleExitEditFileMode}
            />
          )
        }

        const editing3D = is3DModelFile(editingFile.extension)
        const key = String(editingFile.id)
        return (
          <MapPlacementHost
            file={editingFile}
            mode={editMode}
            is3D={editing3D}
            anchor={() => ({
              lng: tempPositionsRef.current[key]?.lng ?? editingFile.lng ?? 0,
              lat: tempPositionsRef.current[key]?.lat ?? editingFile.lat ?? 0,
              elevation: tempElevationsRef.current[key] ?? editingFile.elevation ?? 0,
            })}
            preview={(next, rotation, scale) => {
              tempPositionsRef.current = { ...tempPositionsRef.current, [key]: { lat: next.lat, lng: next.lng } }
              tempElevationsRef.current = { ...tempElevationsRef.current, [key]: next.elevation }
              tempRotationsRef.current = { ...tempRotationsRef.current, [key]: rotation * (180 / Math.PI) }
              tempScalesRef.current = { ...tempScalesRef.current, [key]: scale }
            }}
            onRepaint={handleMapRepaint}
            onDone={handleExitEditFileMode}
          />
        )
      })()}

      <div className={isMapFileManagerOpen ? 'block' : 'hidden'}>
        <MapFileManager closeFileManager={() => fileDispatch({ type: 'HIDE_MAP_FILE_MANAGER' })} />
      </div>

      {contextMenu && (
        <MapPlacementMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          is3D={is3DModelFile(contextMenu.file.extension)}
          isOnMap={mapFileIds.includes(contextMenu.file.id)}
          animated={(contextMenu.animation?.getClips().length ?? 0) > 0}
          onAction={handlePlacementMenuAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      {animating && (
        <AnimationPanel
          name={animating.file.name}
          clips={animating.controls.getClips()}
          state={animating.state}
          labels={animationLabels}
          onClipChange={(clipIndex) => updateAnimation(controls => controls.setClip(clipIndex))}
          onPlayingChange={(playing) => updateAnimation(controls => controls.setPlaying(playing))}
          onSpeedChange={(speed) => updateAnimation(controls => controls.setSpeed(speed))}
          onClose={() => setAnimating(null)}
        />
      )}

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        isDeleting={false}
        onOpenChange={(open: boolean) => { if (!open) setPendingDelete(null) }}
        handleConfirm={() => {
          if (pendingDelete) handleContextMenuAction('delete', pendingDelete)
          setPendingDelete(null)
        }}
        itemName={pendingDelete?.name ?? ''}
      />
    </>
  )
}
