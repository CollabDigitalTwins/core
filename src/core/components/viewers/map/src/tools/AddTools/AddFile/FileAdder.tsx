"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import maplibregl from 'maplibre-gl'
import { useTranslations } from 'next-intl'
import * as React from "react"
import ReactDOM from 'react-dom/client'
import { toast } from 'sonner'
import { mutate } from 'swr'

import { MapContext, FilesContext } from '../../../../../../../store'
import { acceptedFiles, isAcceptedFileType } from '../../../../../../../utils/acceptedFiles'
import { cn } from '../../../../../../../utils/utils'
import { AddItemDialog } from '../../../../../../ui/AddItemDialog'
import { Input } from '../../../../../../ui/Input'
import MapFileMarker from '../../../MapLayers/src/FileLayer/components/MapFileMarker'

import { uploadFileWithProgress } from './utils/uploadToPresignedURLS'

import type { CursorType } from '../../../../../../../types/global'
import type { LucideIcon } from 'lucide-react'

function getFileExtension(file: File): string {
  if (!file?.name) return ''
  const parts = file.name.split('.')
  if (parts.length <= 1) return ''
  return parts.pop()!.toLowerCase()
}

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
  const { map } = mapState.map
  const { dispatch: fileDispatch } = React.useContext(FilesContext)

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)

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
    const markerEl = document.createElement('div')
    markerEl.style.width = '24px'
    markerEl.style.height = '24px'
    markerEl.style.display = 'flex'
    markerEl.style.alignItems = 'center'
    markerEl.style.justifyContent = 'center'

    const iconEl = MapFileMarker({ mimeType: file.type, extension: 'uploading' })
    const iconContainer = document.createElement('div')
    const root = ReactDOM.createRoot(iconContainer)
    root.render(iconEl)
    markerEl.append(iconContainer)

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

      const lng = e.lngLat.lng
      const lat = e.lngLat.lat
      const elevation = 0

      const temporaryFileIcon = addTemporaryFileIcon(map, selectedFile, lng, lat)
      const toastId = toast.loading(`${t('uploading')} "${selectedFile.name}"...`)

      try {
        const fileId = crypto.randomUUID()

        const response = await fetch(`/api/presigned-url-upload?asset=${fileId}`)
        if (!response.ok) throw new Error('Failed to fetch presigned URL')
        const { presignedUrl } = await response.json()

        await uploadFileWithProgress(presignedUrl, selectedFile, () => {})

        const newFile = {
          type: 'map-file',
          url: '',
          name: selectedFile.name?.trim() || 'file name',
          mimeType: selectedFile.type,
          extension: getFileExtension(selectedFile),
          sizeBytes: selectedFile.size,
          uploadedAt: new Date(),
          description: '',
          isVisible: true,
          lat,
          lng,
          elevation,
          assetId: fileId,
        }

        const metadataResponse = await fetch('/api/files/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newFile),
        })

        if (!metadataResponse.ok) {
          throw new Error(`Failed to upload file metadata: ${metadataResponse.statusText}`)
        }

        const { newFile: createdFile } = await metadataResponse.json()

        // Fetch with presigned URL so 3D models can load immediately
        let fileToAdd = createdFile
        try {
          const fileUrlRes = await fetch(`/api/files/${createdFile.id}`)
          if (fileUrlRes.ok) {
            const { file: fileWithUrl } = await fileUrlRes.json()
            if (fileWithUrl) fileToAdd = fileWithUrl
          }
        }
        catch { /* fall back to createdFile without presigned URL */ }

        fileDispatch({ type: 'ADD_FILE', payload: { file: fileToAdd } })
        fileDispatch({ type: 'ADD_TO_MAP', payload: { id: createdFile.id } })

        toast.success(t('uploadSuccess'), { id: toastId })
        mutate(['files'])
        onClose()
      }
      catch (error) {
        toast.error(error instanceof Error ? error.message : t('uploadError'), { id: toastId })
        setIsUploading(false)
        setSelectedFile(null)
      }
      finally {
        temporaryFileIcon.remove()
      }
    }

    const mouseMoveCrosshairHandler = () => setCursor('crosshair')

    if (!map) return

    if (selectedFile && !isUploading) {
      setCursor('crosshair')
      map.on('mousemove', mouseMoveCrosshairHandler)
      map.on('dblclick', dblclickHandler)
    }
    else {
      map.off('mousemove', mouseMoveCrosshairHandler)
      map.off('dblclick', dblclickHandler)
    }

    if (selectedFile) {
      return () => {
        setCursor('')
        map.off('mousemove', mouseMoveCrosshairHandler)
        map.off('dblclick', dblclickHandler)
      }
    }
  }, [selectedFile, isUploading, map])

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
  )
}
