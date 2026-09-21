"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as maplibregl from 'maplibre-gl'
import { useTranslations } from 'next-intl'
import * as React from "react"
import ReactDOM from 'react-dom/client'
import { toast } from 'sonner'
import { mutate } from 'swr'

import { useBuildings } from '../../../../../../../hooks/buildings/buildings'
import { useFiles, useUpdateFile } from '../../../../../../../hooks/files/files'
import { BimContext, MapContext, FilesContext } from '../../../../../../../store'
import { acceptedFiles, isAcceptedFileType } from '../../../../../../../utils/acceptedFiles'
import { cn } from '../../../../../../../utils/utils'
import { AddItemDialog } from '../../../../../../ui/AddItemDialog'
import { extensionOfName } from '../../../../../../ui/FilesManager/src/fileType'
import { Input } from '../../../../../../ui/Input'
import { useFileIntake } from '../../../../../shared/intake/useFileIntake'
import { addFileToMap } from '../../../../utils/addFileToMap'
import MapFileMarker from '../../../MapLayers/src/FileLayer/components/MapFileMarker'
import { resolveClickPlacement } from '../../../Placement/resolveClickPlacement'
import { useBuildingLinkConfirm } from '../../../Placement/useBuildingLinkConfirm'

import type { DbFile } from '../../../../../../../types/dbTypes'
import type { CursorType } from '../../../../../../../types/global'
import type { LucideIcon } from 'lucide-react'

type FileAdderProps = {
  isOpen: boolean
  onClose: () => void
}

type FileAdderDialogProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  icon: LucideIcon
  accept: string
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void
  onFileDrop?: (file: File) => void
  disabled?: boolean
  dropZoneTitle: string
  dropZoneSubtext: string
  hide?: boolean
}

export const FileAdderDialog = ({
  isOpen,
  onClose,
  title,
  icon,
  accept,
  onFileSelect,
  onFileDrop,
  disabled,
  dropZoneTitle,
  dropZoneSubtext,
  hide,
}: FileAdderDialogProps) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFileDrop?.(file)
  }

  if (hide) return null

  return (
    <AddItemDialog
      open={isOpen}
      onOpenChange={open => !open && onClose()}
      title={title}
      icon={icon}
    >
      <div className="flex flex-col gap-3">
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDragEnd={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors select-none',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
          )}
        >
          <LR.Upload className="mx-auto mb-3 text-muted-foreground" size={28} />
          <p className="text-sm font-medium">{dropZoneTitle}</p>
          <p className="text-xs text-muted-foreground mt-1">{dropZoneSubtext}</p>
        </div>

        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={onFileSelect}
          disabled={disabled}
        />
      </div>
    </AddItemDialog>
  )
}

export const FileAdder = ({ isOpen, onClose }: FileAdderProps) => {
  const t = useTranslations('FileAdder')

  const { state: mapState } = React.useContext(MapContext)
  const { map, mapClickManager } = mapState.map
  const { dispatch: fileDispatch } = React.useContext(FilesContext)
  const { dispatch: bimDispatch } = React.useContext(BimContext)
  // The organization's buildings, not the store's: nothing fills that list.
  const { buildings } = useBuildings()
  const updateFileById = useUpdateFile()
  const { confirmLink, dialog: linkDialog } = useBuildingLinkConfirm()

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  const { files } = useFiles()
  // A map file belongs to no building, so it posts itself rather than going through a building route.
  const createMapFile = React.useCallback(async ({ fileData }: { fileData: unknown }) => {
    const response = await fetch('/api/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fileData),
    })
    if (!response.ok) throw new Error(`Failed to save the file record: ${response.statusText}`)
    return response.json()
  }, [])

  const intake = useFileIntake({
    existingNames: (files ?? []).map((file: { name: string }) => file.name),
    uploadFile: createMapFile,
    recordType: 'map-file',
  })

  // Reset state when tool is closed from outside
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null)
      setIsUploading(false)
    }
  }, [isOpen])

  const setCursor = (cursor: CursorType) => {
    if (map) {
      if (map.getCanvas().style.cursor === cursor) return
      map.getCanvas().style.cursor = cursor
    }
  }

  function addTemporaryFileIcon(
    map: maplibregl.Map,
    file: File,
    lng: number,
    lat: number,
  ): maplibregl.Marker {
    // No explicit size: the pin is 36px and a smaller box would clip the ring drawn around it.
    const markerEl = document.createElement('div')
    ReactDOM.createRoot(markerEl).render(
      MapFileMarker({ mimeType: file.type, extension: extensionOfName(file.name), fileName: file.name }),
    )

    return new maplibregl.Marker({ element: markerEl, draggable: false })
      .setLngLat([lng, lat])
      .addTo(map)
  }

  // Show instruction toast when file is selected and dismiss when deselected
  React.useEffect(() => {
    if (!selectedFile) {
      toast.dismiss('place-file-toast')
      return
    }
    toast.info(`${t('placeOnMapToast')}: "${selectedFile.name}"`, {
      id: 'place-file-toast',
      duration: Infinity,
    })
    return () => {
      toast.dismiss('place-file-toast')
    }
  }, [selectedFile])

  // Escape cancels placement
  React.useEffect(() => {
    if (!selectedFile || isUploading) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedFile(null)
        setCursor('')
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedFile, isUploading])

  // Map double-click handler for placement
  React.useEffect(() => {
    const dblclickHandler = async (e: maplibregl.MapMouseEvent): Promise<void> => {
      if (!selectedFile) return
      if (isUploading) return

      setIsUploading(true)
      setCursor(null)
      toast.dismiss('place-file-toast')

      const { lng, lat, elevation, buildingId } = resolveClickPlacement(map, e, buildings ?? [])
      const building = buildingId === null
        ? null
        : (buildings ?? []).find(candidate => candidate.id === buildingId) ?? null
      const linked = building !== null
        && await confirmLink(building.buildingName ?? String(building.id), selectedFile.name)

      const temporaryFileIcon = addTemporaryFileIcon(map, selectedFile, lng, lat)

      try {
        const created = await intake.submit(selectedFile, { lat, lng, elevation, rotation: 0 })
        if (!created?.id) {
          setIsUploading(false)
          setSelectedFile(null)
          return
        }

        // Re-read so a 3D model gets a presigned url and can load without a refresh.
        let fileToAdd: DbFile | null = null
        try {
          const fileUrlRes = await fetch(`/api/files/${created.id}`)
          if (fileUrlRes.ok) {
            const { file: fileWithUrl } = await fileUrlRes.json() as { file?: DbFile }
            if (fileWithUrl) fileToAdd = fileWithUrl
          }
        }
        catch { /* the store refresh below still picks it up */ }

        if (fileToAdd) fileDispatch({ type: 'ADD_FILE', payload: { file: fileToAdd } })
        // A model is drawn from the BIM store; only its own store makes it appear.
        const placed = fileToAdd
          ?? ({ id: created.id, name: selectedFile.name, extension: extensionOfName(selectedFile.name) } as DbFile)
        if (linked && buildingId !== null) {
          placed.attachedFilesBuildingId = buildingId
          await updateFileById(created.id, { attachedFilesBuildingId: buildingId })
        }
        addFileToMap(placed, { fileDispatch, bimDispatch }, linked ? building : null)

        void mutate(['files'])
        onClose()
      }
      catch (error) {
        toast.error(error instanceof Error ? error.message : t('uploadError'))
        setIsUploading(false)
        setSelectedFile(null)
      }
      finally {
        temporaryFileIcon.remove()
      }
    }

    const mouseMoveCrosshairHandler = () => setCursor('crosshair')
    const onDblClick = (e: maplibregl.MapMouseEvent) => { void dblclickHandler(e) }

    if (!map) return

    if (selectedFile && !isUploading) {
      setCursor('crosshair')
      map.on('mousemove', mouseMoveCrosshairHandler)
      map.on('dblclick', onDblClick)
    }
    else {
      map.off('mousemove', mouseMoveCrosshairHandler)
      map.off('dblclick', onDblClick)
    }

    if (selectedFile) {
      return () => {
        setCursor('')
        map.off('mousemove', mouseMoveCrosshairHandler)
        map.off('dblclick', onDblClick)
      }
    }
  }, [selectedFile, isUploading, map, buildings, confirmLink, updateFileById, fileDispatch, bimDispatch])

  // A popover opened by the first click would cover the point the second one needs.
  React.useEffect(() => {
    if (!mapClickManager || !selectedFile) return
    mapClickManager.setSuspended(true)
    return () => mapClickManager.setSuspended(false)
  }, [mapClickManager, selectedFile])

  // Prevent page navigation while uploading
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isUploading])

  const processFile = (file: File) => {
    if (!isAcceptedFileType(file)) {
      toast.error('Unsupported file type. Please select a safe BIM/GIS format.')
      return
    }
    setSelectedFile(file)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (!selected) { toast.warning(t('noFileSelected')); return }
    processFile(selected)
  }

  // When a file is selected (or uploading), dialog closes but component stays mounted
  if (selectedFile) return null

  return (
    <>
      <FileAdderDialog
        isOpen={isOpen}
        onClose={onClose}
        title={t('title')}
        icon={LR.FilePlus}
        accept={acceptedFiles}
        onFileSelect={handleFileSelect}
        onFileDrop={processFile}
        disabled={isUploading}
        dropZoneTitle={t('dropZoneTitle')}
        dropZoneSubtext={t('dropZoneSubtext')}
      />
      {linkDialog}
    </>
  )
}
