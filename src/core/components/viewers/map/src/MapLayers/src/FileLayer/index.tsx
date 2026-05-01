'use client'
import * as React from 'react'
import { Marker } from 'react-map-gl/maplibre'
import { FilesContext, MapContext } from '../../../../../../../store'
import MapFileMarker from './components/MapFileMarker'
import MapFileManager from './components/MapFileManager'
import { openPopupWindow } from './utils/openFileInPopUpWindow'
import { FileModelLayer } from './FileModelLayer/FileModelLayer'
import { useFile, useFiles, useDeleteFile } from '../../../../../../../hooks/files/files'
import { DbFile } from '../../../../../../../types/dbTypes'
import { EditPosition } from '../EditPosition'
import { PlaceOnMap } from '../PlaceOnMap'
import type { FileAction } from '../../../../../../../types/global'
import { downloadDbFile, ViewerContextMenu } from '../../../../../../ui/FilesManager'

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
    <Marker latitude={file.lat} longitude={file.lng}>
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
  const editingFileNameRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    editingFileNameRef.current = editingFile?.name ?? null
  }, [editingFile])

  const handleExitEditFileMode = React.useCallback(() => {
    fileDispatch({ type: 'EDIT_FILE', payload: { file: null } })
  }, [fileDispatch])

  const handleFileSaveSuccess = React.useCallback((file: DbFile, lat: number, lng: number, elevation?: number, rotation?: number) => {
    fileDispatch({
      type: 'UPDATE_FILE_COORDS',
      payload: { id: file.id, lat, lng, elevation, rotation },
    })
  }, [fileDispatch])

  // Sync SWR files into the store (for FileModelLayer and other consumers)
  const { files, isLoading, isError } = useFiles()
  React.useEffect(() => {
    if (isLoading || isError) return
    fileDispatch({ type: 'SET_FILES', payload: { files } })
  }, [files, isLoading, isError])

  const { deleteFile } = useDeleteFile()

  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; file: DbFile } | null>(null)

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
      downloadDbFile(file)
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

  return (
    <>
      <FileModelLayer
        tempPositionsRef={tempPositionsRef}
        editingFileNameRef={editingFileNameRef}
        tempRotationsRef={tempRotationsRef}
        tempElevationsRef={tempElevationsRef}
        onContextMenu={(file, x, y) => setContextMenu({ x, y, file })}
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
        return (
          <EditPosition
            file={editingFile}
            mode={editing3D ? '3d' : '2d'}
            onExitEditMode={handleExitEditFileMode}
            onSaveSuccess={handleFileSaveSuccess}
            tempPositionsRef={tempPositionsRef}
            tempRotationsRef={editing3D ? tempRotationsRef : undefined}
            tempElevationsRef={editing3D ? tempElevationsRef : undefined}
            onMapRepaint={handleMapRepaint}
            dragHandle={!editing3D ? (
              <MapFileMarker
                mimeType={editingFile.mimeType}
                extension={editingFile.extension}
              />
            ) : undefined}
          />
        )
      })()}

      <div className={isMapFileManagerOpen ? 'block' : 'hidden'}>
        <MapFileManager closeFileManager={() => fileDispatch({ type: 'HIDE_MAP_FILE_MANAGER' })} />
      </div>

      {contextMenu && (
        <ViewerContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          options={['view', 'move', 'download', 'delete']}
          onAction={handleContextMenuAction}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}
