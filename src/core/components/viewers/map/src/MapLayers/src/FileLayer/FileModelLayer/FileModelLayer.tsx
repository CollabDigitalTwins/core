"use client"

import * as THREE from 'three'
import { MapContext, FilesContext } from '../../../../../../../../store'

import * as React from 'react'
import { CustomModelLayer } from '../utils/CustomModelLayer'
import { DbFile } from '../../../../../../../../types/dbTypes'

type LoadedModelFiles = {
  file: DbFile
  cleanUpFunction: () => void
  hitTest: (ndcX: number, ndcY: number) => boolean
}

interface FileModelLayerProps {
  tempPositionsRef?: React.MutableRefObject<Record<string, { lat: number; lng: number }>>
  editingFileNameRef?: React.MutableRefObject<string | null>
  tempRotationsRef?: React.MutableRefObject<Record<string, number>>
  tempElevationsRef?: React.MutableRefObject<Record<string, number>>
  /** Called when the user right-clicks on a rendered 3D mesh. */
  onContextMenu?: (file: DbFile, clientX: number, clientY: number) => void
}

export const FileModelLayer = ({
  tempPositionsRef,
  editingFileNameRef,
  tempRotationsRef,
  tempElevationsRef,
  onContextMenu,
}: FileModelLayerProps) => {
  const { state: mapState } = React.useContext(MapContext)
  const { map } = mapState.map
  const { state: fileState } = React.useContext(FilesContext)
  const { files: globalFileState, mapFileIds } = fileState.files

  const is3DModelFile = (extension?: string | null): boolean => {
    if (!extension) return false
    const ext = extension.toLowerCase()
    return ['glb', 'gltf', 'fbx', 'obj', 'collada'].includes(ext)
  }

  const mapFiles = React.useMemo(
    () => globalFileState.filter(file => is3DModelFile(file.extension) && mapFileIds.includes(file.id) && !!file.url),
    [globalFileState, mapFileIds]
  )

  const [loadedModels, setLoadedModels] = React.useState<LoadedModelFiles[]>([])
  const rendererRef = React.useRef<THREE.WebGLRenderer | null>(null)

  // Stable refs so the canvas listener never needs to be re-registered
  const loadedModelsRef = React.useRef<LoadedModelFiles[]>([])
  const onContextMenuRef = React.useRef(onContextMenu)
  loadedModelsRef.current = loadedModels
  onContextMenuRef.current = onContextMenu

  // ── Layer management ───────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!map) return
    if (!rendererRef.current) {
      rendererRef.current = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: map.getCanvas().getContext('webgl') as WebGLRenderingContext,
        antialias: true,
      })
    }
    const currentModelFiles = mapFiles.filter(file => {
      const ext = file.extension?.toLowerCase()
      return ext === 'glb' || ext === 'gltf' || ext === 'fbx' || ext === 'obj' || ext === 'collada'
    })
    const loadedIds = new Set(loadedModels.map(model => model.file.id))
    const currentFileIds = new Set(currentModelFiles.map(f => f.id))

    const modelsToRemove = loadedModels.filter(model => !currentFileIds.has(model.file.id))

    const modelsWithChangedCoords = loadedModels.filter(model => {
      if (!currentFileIds.has(model.file.id)) return false
      const updated = currentModelFiles.find(f => f.id === model.file.id)
      return updated && (
        updated.lat !== model.file.lat ||
        updated.lng !== model.file.lng ||
        updated.rotation !== model.file.rotation ||
        updated.elevation !== model.file.elevation
      )
    })

    for (const model of [...modelsToRemove, ...modelsWithChangedCoords]) {
      model.cleanUpFunction()
    }

    const staleIds = new Set(modelsWithChangedCoords.map(m => m.file.id))

    const filesNotLoaded = currentModelFiles.filter(
      file => !loadedIds.has(file.id) || staleIds.has(file.id)
    )

    const newLoadedModels = loadedModels
      .filter(model => currentFileIds.has(model.file.id) && !staleIds.has(model.file.id))

    for (const file of filesNotLoaded) {
      const { cleanup, hitTest } = CustomModelLayer(
        file,
        map,
        rendererRef.current,
        tempPositionsRef,
        editingFileNameRef,
        tempRotationsRef,
        tempElevationsRef,
      )
      newLoadedModels.push({ file, cleanUpFunction: cleanup, hitTest })
    }

    setLoadedModels(newLoadedModels)
  }, [mapFiles, map])

  // ── Canvas right-click → raycasting ───────────────────────────────────────
  React.useEffect(() => {
    if (!map) return
    const canvas = map.getCanvas()

    const handleContextMenu = (e: MouseEvent) => {
      // Only handle clicks that land directly on the WebGL canvas (not on HTML
      // marker overlays — those have their own onContextMenu handlers)
      if (e.target !== canvas) return

      const models = loadedModelsRef.current
      if (models.length === 0) return

      const rect = canvas.getBoundingClientRect()
      const ndcX =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
      const ndcY = -((e.clientY - rect.top)  / rect.height) * 2 + 1

      for (const model of models) {
        if (model.hitTest(ndcX, ndcY)) {
          e.preventDefault()
          e.stopPropagation()
          onContextMenuRef.current?.(model.file, e.clientX, e.clientY)
          break
        }
      }
    }

    // Use capture phase so we see the event before MapLibre's own handlers
    canvas.addEventListener('contextmenu', handleContextMenu, true)
    return () => canvas.removeEventListener('contextmenu', handleContextMenu, true)
  }, [map])

  return null
}
