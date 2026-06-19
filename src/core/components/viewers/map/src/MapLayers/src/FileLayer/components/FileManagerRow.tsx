"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import FileIcon from './FileIcon'
import { Button } from '../../../../../../../../components/ui/Button'
import * as LR from 'lucide-react'
import * as React from 'react'
import { useTranslations } from 'next-intl'
import { MapContext } from '../../../../../../../../store'
import ConfirmDialog from '../../../../../../../ConfirmDialog'
import { DbFile } from '../../../../../../../../types/dbTypes'

interface FileManagerRowProps {
  file: DbFile
  isOnMap: boolean
  onVisibilityToggle: () => void
  onEditFile: () => void
  onRemoveFile: () => void
}

export function FileManagerRow({
  file,
  isOnMap,
  onVisibilityToggle,
  onEditFile,
  onRemoveFile,
}: FileManagerRowProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const { state: mapState } = React.useContext(MapContext)
  const t = useTranslations('FileMoreOptions')
  const { map } = mapState.map

  const handleIconClick = (file: DbFile) => {
    if (map == null) return
    let center: [number, number]
    if ('lng' in file.position && 'lat' in file.position) {
      center = [file.position.lng, file.position.lat]
    }
    else if ('x' in file.position && 'y' in file.position) {
      center = [Number(file.position.x), Number(file.position.y)]
    }
    else {
      center = [0, 0]
    }
    map.flyTo({ center, zoom: 14, speed: 10, curve: 1, maxDuration: 100, essential: true })
  }

  return (
    <div
      className={
        'flex items-center p-2 gap-2 border rounded-sm text-sm cursor-pointer'
        + (isDeleting ? ' animate-pulse bg-yellow-50' : '')
      }
      title={file.name}
    >
      <FileIcon mimeType={file.mimeType} extension={file.extension} size={20} />

      <span onClick={() => handleIconClick(file)} className="flex-1 truncate">{file.name}</span>

      <div className="flex gap-0">
        <Button
          variant="ghost"
          className="pointer-events-auto p-1"
          size="sm"
          onClick={onVisibilityToggle}
        >
          {isOnMap ? <LR.Eye size={14} /> : <LR.EyeOff size={14} />}
        </Button>
        <Button
          variant="ghost"
          className="pointer-events-auto p-1"
          size="sm"
          onClick={onEditFile}
        >
          <LR.FileEdit size={14} />
        </Button>

        <Button
          variant="ghost"
          className="pointer-events-auto p-1"
          size="sm"
          onClick={() => setIsDeleteDialogOpen(true)}
        >
          <LR.Trash2 size={14} />
        </Button>
      </div>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        isDeleting={isDeleting}
        onOpenChange={setIsDeleteDialogOpen}
        handleConfirm={async (e) => {
          e.preventDefault()
          setIsDeleting(true)
          try {
            await Promise.resolve(onRemoveFile())
          }
          finally {
            setIsDeleting(false)
            setIsDeleteDialogOpen(false)
          }
        }}
        itemName={file.name}
        dataType={t('file')}
      />
    </div>
  )
}
