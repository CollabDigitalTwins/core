import * as React from 'react'
import * as LR from 'lucide-react'
import { BimContext, BuildingsContext, MenusContext } from '../../../../../../../../store'
import { ModelManager } from '../../../../ModelManager'
import { DXFManager } from '../../../../DXFLoader'
import * as THREE from 'three'
import { GizmoController } from '../../../../../utils/GizmoController'
import { CurrentWorld } from '../../../../CurrentWorld'
import { Cursor } from '../../../../Cursor'
import { Highlighter } from '../../../../Highlighter'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { useTranslations } from 'next-intl'
import ConfirmDialog from '../../../../../../../ConfirmDialog'
import { useUploadFileToBuilding, useDeleteFile, useFile } from '../../../../../../../../hooks/files/files'
import { useFileUploadHandler, useFileDeleteHandler, FileItemComponent, useFileActions, useCommonFileUpload } from '../../../../../../../ui/FilesManager'
import { IDSManager } from '../../../../IDSManager'
import { BCFTopicsManager } from '../../../../BCFTopicsManager'
import { DbFile as IFile } from '../../../../../../../../types/dbTypes'

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
    onDeleteSuccess: () => {
      console.log('File deleted successfully')
    },
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
      return files
        .filter(file => file.tag !== 'user')
        .filter(file => (file as any).type !== 'map-file')
        .map(file => {
          // Preserve user's toggle state for already-tracked files.
          // All new files start hidden — user explicitly adds them via the eye icon.
          let isVisible = visibilityMap.has(file.id) ? visibilityMap.get(file.id)! : false
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
        if (file.rotation != null) group.rotation.y = file.rotation as number
        world.scene.three.add(group)
        dxfGroupsRef.current.set(key, group)
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
      const bcfManager = bimComponents?.get(BCFTopicsManager)
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
            const rotation = file.rotation != null
              ? new THREE.Euler(0, file.rotation, 0)
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
      if (fragments) fragments.core.update(true)
    }

    // DXF files managed via DXFManager
    if (file.extension === 'dxf') {
      await toggleDxfVisibility(file, newVisibility)
      if (fragments) fragments.core.update(true)
    }
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
              .then(res => res.ok ? res.json() : Promise.reject(res.status))
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

    document.addEventListener('dblclick', handleDblClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('dblclick', handleDblClick)
      document.removeEventListener('keydown', handleKeyDown)
      if (cursor) cursor.cursor = ''
    }
  }, [placingFile, bimComponents, raycast])

  // Move handler: unplaced files → click-to-place; placed files → gizmo
  const handleBimMove = React.useCallback((file: IFile) => {
    const isPlaced = file.x != null && file.y != null && file.z != null

    // Unplaced file: enter click-to-place mode
    if (!isPlaced) {
      setPlacingFile(file)
      setMoveFileId(file.id)
      return
    }

    // Placed file: attach/detach gizmo
    if (!bimComponents || !modelManager) return

    const world = bimComponents.get(CurrentWorld).world
    if (!world) return

    const modelInfo = modelManager.getModelByName(file.name)
    if (!modelInfo) return

    const existing = gizmoControllersRef.current.get(file.name)
    if (existing) {
      existing.dispose()
      gizmoControllersRef.current.delete(file.name)
    } else {
      const gizmo = new GizmoController(world)
      const cleanupGizmo = (savePosition: boolean) => {
        if (savePosition) {
          const { x, y, z } = modelInfo.model.position
          const rotation = modelInfo.model.rotation.y
          updateFileRef.current({ x, y, z, rotation } as any)
            .catch((err: unknown) => console.error(`Failed to save position for "${file.name}":`, err))
          file.x = x
          file.y = y
          file.z = z
          file.rotation = rotation
        }
        gizmoControllersRef.current.delete(file.name)
        setMoveFileId(null)
      }
      gizmo.onAccept = () => cleanupGizmo(true)
      gizmo.onCancel = () => cleanupGizmo(false)
      setMoveFileId(file.id)
      gizmo.attach(modelInfo.model)
      gizmoControllersRef.current.set(file.name, gizmo)
    }
  }, [bimComponents, modelManager])

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
    onUploadSuccess: () => {
      console.log('File uploaded successfully')
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
      if (fragments) fragments.core.update(true)
    },
  })

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
              options={is3DFile(item.extension) ? OPTIONS_3D : OPTIONS_NON_3D}
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
