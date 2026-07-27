'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { MenusContext, usePermissions } from '../../../../store'
import { getFileIcon } from '../../../../utils/getFileIcon'
import ConfirmDialog from '../../../ConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../DropdownMenu'

import type { DbFile as DbFile } from '../../../../types/dbTypes'
import type { FileAction } from '../../../../types/global'

export interface FileMenuContentProps {
  file: DbFile & { isVisible?: boolean }
  // Async handlers are supported: the delete flow awaits the result to keep its
  // spinner up (see handleDeleteConfirm), other actions are fire-and-forget.
  onAction: (action: FileAction, file: DbFile) => void | Promise<void>
  options: FileAction[]
  confirmDelete?: boolean
}

/** Shared menu items used by both FileItemComponent's dropdown and MapContextMenu. */
export function FileMenuContent({ file, onAction, options, confirmDelete = true }: FileMenuContentProps) {
  const t = useTranslations('FileItemComponent')
  const tDialog = useTranslations('FileMoreOptions')
  const { ability } = usePermissions()
  const canReadFile = ability.can('read', 'File')
  const canUpdateFile = ability.can('update', 'File')
  const canDeleteFile = ability.can('delete', 'File')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const { state: menusState } = React.useContext(MenusContext)
  const { currentViewer } = menusState.menus

  const isPlaced = currentViewer === 'bim'
    ? true // BIM models are always placed — null x/y/z means origin (0,0,0), use move to reposition
    : currentViewer === 'pointcloud'
    ? true // for point clouds we don't have position yet
      : currentViewer === 'map'
        ? file.lat != null && file.lng != null
        : false

  const isGhost = !!(file as any).isGhost
  const hasPlaceOption = options.includes('view') || options.includes('move')

  const handleDeleteClick = React.useCallback(() => {
    if (confirmDelete) {
      setIsDeleteDialogOpen(true)
      return
    }

    void onAction('delete', file)
  }, [confirmDelete, onAction, file])

  const handleDeleteConfirm = React.useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDeleting(true)
    try {
      await Promise.resolve(onAction('delete', file))
    }
    finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }, [onAction, file])

  return (
    <>
      {options.includes('download') && (
        <DropdownMenuItem
          onClick={() => { void onAction('download', file) }}
          disabled={!canReadFile}
        >
          <LR.Download className="h-4 w-4" />
          {t('downloadTitle')}
        </DropdownMenuItem>
      )}
      {hasPlaceOption && !isPlaced && (
        <DropdownMenuItem
          onClick={() => { void onAction('move', file) }}
          disabled={!canReadFile || !canUpdateFile}
        >
          <LR.Locate className="h-4 w-4" />
          {t('placeTitle')}
        </DropdownMenuItem>
      )}
      {options.includes('view') && isPlaced && (
        <DropdownMenuItem
          onClick={() => { void onAction('view', file) }}
          disabled={!canReadFile}
        >
          {file.isVisible !== false
            ? <LR.EyeOff className="h-4 w-4" />
            : <LR.Eye className="h-4 w-4" />}
          {file.isVisible !== false ? t('hideTitle') : t('showTitle')}
        </DropdownMenuItem>
      )}
      {options.includes('ghost') && (
        <DropdownMenuItem
          onClick={() => { void onAction('ghost', file) }}
          disabled={!canReadFile || !canUpdateFile}
        >
          {isGhost ? <LR.Box className="h-4 w-4" /> : <LR.Ghost className="h-4 w-4" />}
          {isGhost ? t('unghostTitle') : t('ghostTitle')}
        </DropdownMenuItem>
      )}
      {options.includes('move') && isPlaced && (
        <DropdownMenuItem
          onClick={() => { void onAction('move', file) }}
          disabled={!canReadFile || !canUpdateFile}
        >
          <LR.Move className="h-4 w-4" />
          {t('moveTitle')}
        </DropdownMenuItem>
      )}
      {options.includes('edit') && (
        <DropdownMenuItem
          onClick={() => { void onAction('edit', file) }}
          disabled={!canReadFile || !canUpdateFile}
        >
          <LR.Pencil className="h-4 w-4" />
          {t('editTitle')}
        </DropdownMenuItem>
      )}
      {options.includes('info') && (
        <DropdownMenuItem
          onClick={() => { void onAction('info', file) }}
          disabled={!canReadFile}
        >
          <LR.Info className="h-4 w-4" />
          {t('infoTitle')}
        </DropdownMenuItem>
      )}
      {options.includes('delete') && (
        <>
          {options.some(o => o !== 'delete') && <DropdownMenuSeparator />}
          <DropdownMenuItem
            onSelect={(e) => {
              if (confirmDelete) e.preventDefault()
            }}
            onClick={handleDeleteClick}
            disabled={!canDeleteFile}
            className="focus:text-destructive"
          >
            <LR.Trash2 className="h-4 w-4" />
            {t('deleteTitle')}
          </DropdownMenuItem>
        </>
      )}

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        isDeleting={isDeleting}
        onOpenChange={setIsDeleteDialogOpen}
        handleConfirm={(e) => void handleDeleteConfirm(e)}
        itemName={file.name}
        dataType={tDialog('file')}
      />
    </>
  )
}

export interface FileItemComponentProps {
  file: DbFile & { isVisible?: boolean }
  onAction: (action: FileAction, file: DbFile) => void | Promise<void>
  options: FileAction[]
  translationKey?: string
  confirmDelete?: boolean
}

export const FileItemComponent = React.memo(function FileItemComponent({
  file,
  onAction,
  options,
  confirmDelete = true,
}: FileItemComponentProps) {
  const t = useTranslations('FileItemComponent')
  const Icon = getFileIcon(file)

  return (
    <div className={`flex items-center justify-between px-2 py-1 hover:bg-accent/50 rounded-md transition-colors ${
      file.isVisible !== false ? '' : 'opacity-50'
    }`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0 ">
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm text-foreground truncate cursor-pointer">{file.name}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground flex-shrink-0"
            title={t('moreOptions')}
          >
            <LR.MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <FileMenuContent
            file={file}
            onAction={onAction}
            options={options}
            confirmDelete={confirmDelete}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})
