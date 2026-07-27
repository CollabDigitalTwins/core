'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { mutate } from 'swr'

import { useFilesContext, useMenusContext } from '../../../../store'
import { ViewerNames } from '../../../../types'
import { useSidebar } from '../../Sidebar'

import { downloadFile } from './downloadUtils'

import type { DbFile } from '../../../../types/dbTypes'
import type { FileAction } from '../../../../types/global'

export interface UseFileActionsProps {
  files: (DbFile & { isVisible?: boolean })[]
  setFiles: React.Dispatch<React.SetStateAction<(DbFile & { isVisible?: boolean })[]>>
  buildingId: number
  // Deletion is awaited, visibility toggling is fire-and-forget; both accept
  // async callbacks, which several viewers pass.
  handleDeleteFile: (file: DbFile) => void | Promise<void>
  onDownload?: (file: DbFile) => void
  onView?: (file: DbFile, newVisibility: boolean) => void | Promise<void>
  onDelete?: (file: DbFile) => void
  onMove?: (file: DbFile) => void
  onGhost?: (file: DbFile, ghostState: boolean) => void
  onInfo?: (file: DbFile) => void
}

export function useFileActions({
  files,
  setFiles,
  buildingId,
  handleDeleteFile,
  onDownload,
  onView,
  onDelete,
  onMove,
  onGhost,
  onInfo
}: UseFileActionsProps) {
  const [deleteTarget, setDeleteTarget] = React.useState<DbFile | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const {
    dispatch: menusDispatch,
    setView,
  } = useMenusContext()
  const { dispatch: filesDispatch } = useFilesContext()
  const { setOpenInfo } = useSidebar()

  const handleInfo = React.useCallback((file: DbFile) => {
    if (onInfo) {
      onInfo(file)
      return
    }

    setOpenInfo(false)
    filesDispatch({
      type: 'SET_CURRENT_FILE',
      payload: { currentFile: file },
    })
    menusDispatch({
      type: 'SET_VIEWER',
      payload: { currentViewer: ViewerNames.files },
    })
    setView('detail')
  }, [onInfo, setOpenInfo, filesDispatch, menusDispatch, setView])

  const updateItems = React.useCallback((files: (DbFile & { isVisible?: boolean })[], file: DbFile, action: 'view' | 'delete') => {
    return files.map((f) => {
      if (f.id === file.id) {
        if (action === 'view') {
          return { ...f, isVisible: f.isVisible !== false ? false : true }
        }
        else if (action === 'delete') {
          return null
        }
      }
      return f
    }).filter(Boolean) as (DbFile & { isVisible?: boolean })[]
  }, [])

  const confirmDelete = React.useCallback(async () => {
    if (!deleteTarget) return

    setIsDeleting(true)

    try {
      await Promise.resolve(handleDeleteFile(deleteTarget))
      setFiles(prev => updateItems(prev, deleteTarget, 'delete'))
      onDelete?.(deleteTarget)
      if (buildingId) void mutate(`/api/files/building/${buildingId}`)
    }
    finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget, handleDeleteFile, setFiles, updateItems, onDelete, buildingId])

  const handleAction = React.useCallback(async (action: FileAction, file: DbFile) => {
    if (!file) return

    if (action === 'delete') {
      setDeleteTarget(file)
    }
    else if (action === 'view') {
      const newVisibility = file.isVisible === false
      setFiles(prev => updateItems(prev, file, action))
      // Call custom onView handler
      void onView?.(file, newVisibility)
    }
    else if (action === 'move') {
        // Call custom handlers for move and place actions
        onMove?.(file)
    }
    else if (action === 'ghost') {
        const newGhostState = !(file as any).isGhost
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, isGhost: newGhostState } as any : f))
        onGhost?.(file, newGhostState)
    }
    else if (action === 'download') {
      // Check for custom download handler first
      if (onDownload) {
        onDownload(file)
        return
      }

      // Generic download fallback using centralized utility
      await downloadFile(file.url, file)
    }
    else if (action === 'info') {
      handleInfo(file)
    }
  }, [setFiles, updateItems, onDownload, onView, onMove, onGhost, handleInfo])

  const onDeleteDialogOpenChange = React.useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null)
  }, [])

  const onDeleteDialogConfirm = React.useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    await confirmDelete()
  }, [confirmDelete])

  // Both stay awaitable (callers and tests await them); the consumers that hand
  // them to void-returning props ignore the promise at the call site.
  return {
    handleAction,
    deleteDialog: {
      isOpen: deleteTarget != null,
      isDeleting,
      itemName: deleteTarget?.name,
      onOpenChange: onDeleteDialogOpenChange,
      onConfirm: onDeleteDialogConfirm,
    },
  }
}
