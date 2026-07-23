'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'

import { cn } from '../../../utils/utils'
import { Button } from '../Button'

export interface CommentActionLabels {
  reply?: string
  edit?: string
  delete?: string
  close?: string
}

interface CommentActionButtonsProps {
  onReply?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onClose?: () => void
  canReply?: boolean
  canEdit?: boolean
  canDelete?: boolean
  labels?: CommentActionLabels
  className?: string
  /** Applied to each icon button; lets the caller size the row (sidebar h-8, 3D card h-7). */
  buttonClassName?: string
  /**
   * Fire on pointerdown instead of click. Needed inside the 3D comment card: the CSS2D renderer
   * re-transforms the element every frame, so a browser "click" frequently never fires there.
   */
  activateOnPointerDown?: boolean
}

/**
 * Presentational reply/edit/delete/close row shared by the sidebar comment item and the
 * in-viewer comment card. Intentionally free of i18n and permission hooks: the in-viewer
 * card renders in a detached React root without the next-intl provider, so labels are
 * passed in and gating is expressed by which handlers/`can*` flags the caller supplies.
 */
export function CommentActionButtons({
  onReply,
  onEdit,
  onDelete,
  onClose,
  canReply = true,
  canEdit = true,
  canDelete = true,
  labels,
  className,
  buttonClassName,
  activateOnPointerDown = false,
}: CommentActionButtonsProps): React.ReactElement {
  const activate = (handler?: () => void) => (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation()
    handler?.()
  }

  // Bind the action to pointerdown (3D card) or click (sidebar). Returns the right prop object.
  const bind = (handler?: () => void) =>
    activateOnPointerDown ? { onPointerDown: activate(handler) } : { onClick: activate(handler) }

  const btn = cn('h-8 w-8 p-0', buttonClassName)

  return (
    <div className={cn('flex items-center gap-0 flex-shrink-0', className)}>
      {onReply && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btn}
          {...bind(onReply)}
          title={labels?.reply ?? 'Reply'}
          aria-label={labels?.reply ?? 'Reply'}
          disabled={!canReply}
        >
          <LR.Reply className="h-4 w-4" />
        </Button>
      )}
      {onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btn}
          {...bind(onEdit)}
          title={labels?.edit ?? 'Edit'}
          aria-label={labels?.edit ?? 'Edit'}
          disabled={!canEdit}
        >
          <LR.Pencil className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btn}
          {...bind(onDelete)}
          title={labels?.delete ?? 'Delete'}
          aria-label={labels?.delete ?? 'Delete'}
          disabled={!canDelete}
        >
          <LR.Trash2 className="h-4 w-4" />
        </Button>
      )}
      {onClose && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btn}
          {...bind(onClose)}
          title={labels?.close ?? 'Close'}
          aria-label={labels?.close ?? 'Close'}
        >
          <LR.X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
