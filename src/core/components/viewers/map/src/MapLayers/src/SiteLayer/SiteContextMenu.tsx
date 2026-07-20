'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import ConfirmDialog from '../../../../../../ConfirmDialog'
import { Button } from '../../../../../../ui/Button'
import { Input } from '../../../../../../ui/Input'

import type { ShownSite } from '../../../../../../../store/MapSites/reducer'

export interface SiteContextMenuProps {
  x: number
  y: number
  site: ShownSite
  isEditing: boolean
  canUpdate: boolean
  canDelete: boolean
  canRead: boolean
  onClose: () => void
  onRename: (name: string) => void
  onToggleEdit: () => void
  onHide: () => void
  onInfo: () => void
  onDelete: () => void | Promise<void>
}

export const SiteContextMenu: React.FC<SiteContextMenuProps> = ({
  x, y, site, isEditing, canUpdate, canDelete, canRead,
  onClose, onRename, onToggleEdit, onHide, onInfo, onDelete,
}) => {
  const t = useTranslations('SiteContextMenu')
  // Translate with an English fallback so the menu is usable before the host
  // app's message catalog is updated (mirrors SiteAdder's approach).
  const tf = React.useCallback(
    (key: string, fallback: string) => (t.has(key) ? t(key) : fallback),
    [t],
  )

  const ref = React.useRef<HTMLDivElement>(null)
  const [name, setName] = React.useState(site.name)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  React.useEffect(() => { setName(site.name) }, [site.id, site.name])

  // Close on outside click / Escape, unless the delete confirmation is open or
  // the user is editing the polygon (dragging a vertex is an "outside" click).
  React.useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (isDeleteOpen || isEditing) return
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (isDeleteOpen || isEditing) return
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [isDeleteOpen, isEditing, onClose])

  const commitName = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== site.name) onRename(trimmed)
  }

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDeleting(true)
    try {
      await onDelete()
    }
    finally {
      setIsDeleting(false)
      setIsDeleteOpen(false)
    }
  }

  return (
    <div
      ref={ref}
      className="fixed z-50 w-56 rounded-md border bg-popover text-popover-foreground shadow-md p-1"
      style={{ left: x, top: y }}
      onClick={e => e.stopPropagation()}
    >
      {/* Editable site name */}
      <div className="px-2 pt-1.5 pb-2">
        <Input
          value={name}
          disabled={!canUpdate}
          onChange={e => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitName(); (e.target as HTMLInputElement).blur() }
          }}
          placeholder={tf('namePlaceholder', 'Site name')}
          className="h-8 text-sm"
        />
      </div>

      <div className="h-px bg-border my-1" />

      <button
        type="button"
        onClick={onToggleEdit}
        disabled={!canUpdate}
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
      >
        {isEditing
          ? <LR.Check className="h-4 w-4" />
          : <LR.PencilRuler className="h-4 w-4" />}
        {isEditing ? tf('doneEditing', 'Done editing shape') : tf('editShape', 'Edit shape')}
      </button>

      <button
        type="button"
        onClick={onHide}
        disabled={!canRead}
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
      >
        <LR.EyeOff className="h-4 w-4" />
        {tf('hide', 'Hide')}
      </button>

      <button
        type="button"
        onClick={onInfo}
        disabled={!canRead}
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
      >
        <LR.Info className="h-4 w-4" />
        {tf('info', 'Site details')}
      </button>

      <div className="h-px bg-border my-1" />

      <button
        type="button"
        onClick={() => setIsDeleteOpen(true)}
        disabled={!canDelete}
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
      >
        <LR.Trash2 className="h-4 w-4" />
        {tf('delete', 'Delete site')}
      </button>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        isDeleting={isDeleting}
        onOpenChange={setIsDeleteOpen}
        handleConfirm={handleConfirmDelete}
        itemName={site.name}
        dataType={tf('siteDataType', 'site')}
      />
    </div>
  )
}
