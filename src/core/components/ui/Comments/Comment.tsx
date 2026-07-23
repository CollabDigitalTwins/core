'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'

import { useFile } from '../../../hooks/files/files'
import { commentRingShadow } from '../../../utils/markerUtils'
import { formatTimestamp } from '../../../utils/timeUtils'
import { Avatar } from '../Avatar'
import { Button } from '../Button'
import { Card } from '../Card'
import { UserAvatar } from '../UserAvatar'

import { CommentActionButtons, type CommentActionLabels } from './CommentActionButtons'

export type CommentProps = {
  userName: string
  userImage: number | null
  userImageFileId?: number | null
  buildingId?: number
  text: string
  createdAt: string | Date
  onRemove?: () => void
  onClose?: () => void
  /** Called when the collapsed avatar is single-clicked (select the comment). */
  onSelect?: () => void
  /** Called on double-click — used to zoom/focus the comment in the viewer. */
  onFocus?: () => void
  /** Reply to the comment (in-viewer card opens the reply box in the sidebar). */
  onReply?: () => void
  /** Edit the comment (in-viewer card opens the editor in the sidebar). */
  onEdit?: () => void
  enableCollapse?: boolean
  defaultCollapsed?: boolean
  isPending?: boolean
  highlight?: boolean
  /** Double-clicked/zoomed comment: renders the thicker focus ring. */
  focused?: boolean
  /** Render the close/reply/edit/delete action row (used by the in-viewer BIM card). */
  showActions?: boolean
  canReply?: boolean
  canEdit?: boolean
  canDelete?: boolean
  actionLabels?: CommentActionLabels
}

export default function Comment({
  text,
  createdAt,
  userName,
  userImage,
  userImageFileId,
  onRemove,
  onClose,
  onSelect,
  onFocus,
  onReply,
  onEdit,
  enableCollapse = false,
  defaultCollapsed = false,
  isPending = false,
  highlight = false,
  focused = false,
  showActions = false,
  canReply = true,
  canEdit = true,
  canDelete = true,
  actionLabels,
}: CommentProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  // Timestamp of the last press, shared across the puck→card transition so a quick second press
  // (double-click) zooms even though the first press already opened the card.
  const lastTap = React.useRef(0)
  const resolvedImageFileId = userImageFileId ?? userImage
  const { file } = useFile(resolvedImageFileId)
  const previewSrc = file?.url

  // Zooming to a comment (focus) should also open its card in the 3D scene.
  React.useEffect(() => {
    if (focused && enableCollapse) setIsCollapsed(false)
  }, [focused, enableCollapse])

  const handleClose = () => {
    if (enableCollapse) setIsCollapsed(true)
    else onClose?.()
  }

  if (enableCollapse && isCollapsed) {
    return (
      <div
        className="h-9 w-9 rounded-full overflow-hidden flex-shrink-0 pointer-events-auto cursor-pointer transition-transform relative"
        style={{ boxShadow: commentRingShadow({ highlight, focused }) }}
        // Open on pointerdown, not click: the CSS2D renderer re-transforms this element every
        // frame, so a browser "click" (down+up on the same stable spot) often never fires in the
        // 3D scene. stopPropagation keeps the press from reaching the canvas/orbit controls.
        onPointerDown={(e) => {
          e.stopPropagation()
          lastTap.current = performance.now()
          onSelect?.()
          setIsCollapsed(false)
        }}
      >
        {isPending ? (
          <div className="w-full h-full rounded-full bg-primary-light flex items-center justify-center">
            <LR.Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Avatar className="h-full w-full">
            <UserAvatar
              imageFileId={resolvedImageFileId}
              previewSrc={previewSrc}
              name={userName}
              className="h-full w-full rounded-full object-cover"
            />
          </Avatar>
        )}
      </div>
    )
  }

  return (
    <div
      className="relative inline-block group"
      style={{ pointerEvents: 'auto', boxShadow: focused ? commentRingShadow({ focused }) : undefined, borderRadius: focused ? 12 : undefined, zIndex: focused ? 30 : highlight ? 20 : undefined }}
      title={onFocus ? 'Double click to zoom' : enableCollapse ? 'Double click to collapse' : undefined}
      // In the 3D card, detect a double-press here (dblclick is unreliable under the CSS2D
      // renderer) to trigger zoom. The map popup keeps the normal onDoubleClick path below.
      onPointerDown={(e) => {
        e.stopPropagation()
        if (!enableCollapse) return
        const now = performance.now()
        if (now - lastTap.current < 300) onFocus?.()
        lastTap.current = now
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        if (!enableCollapse) onClose?.()
      }}
    >
      <Card className="w-48 px-3 py-2.5 shadow-md group-hover:shadow-lg transition-shadow duration-200">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full shadow-sm flex items-center justify-center select-none flex-shrink-0 bg-card">
            {isPending ? (
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <LR.Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Avatar className="h-10 w-10">
                <UserAvatar
                  imageFileId={resolvedImageFileId}
                  previewSrc={previewSrc}
                  name={userName}
                  className="h-full w-full rounded-full object-cover"
                />
              </Avatar>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <span className="font-medium text-sm text-foreground leading-none truncate">
              {userName}
            </span>
            <span className="text-xs text-muted-foreground leading-none">
              {formatTimestamp(createdAt)}
            </span>
          </div>

          {showActions && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title={actionLabels?.close ?? 'Close'}
              aria-label={actionLabels?.close ?? 'Close'}
              className="h-7 w-7 shrink-0 -mr-1 -mt-1"
              // In the CSS2D 3D card (enableCollapse) activate on pointerdown for reliability;
              // the map popup is normal DOM, so keep click for keyboard accessibility.
              {...(enableCollapse
                ? { onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); handleClose() } }
                : { onClick: (e: React.MouseEvent) => { e.stopPropagation(); handleClose() } })}
            >
              <LR.X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="mt-2 flex items-start gap-2">
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
            {text}
          </p>

          {/* Map popup keeps the inline delete; the BIM card uses the action row below instead. */}
          {!showActions && onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title={actionLabels?.delete ?? 'Remove comment'}
              className="z-50 h-7 w-7 shrink-0"
              aria-label={actionLabels?.delete ?? 'Remove comment'}
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
            >
              <LR.Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {showActions && (onReply || onEdit || onRemove) && (
          <div className="mt-2 flex justify-end border-t pt-1">
            <CommentActionButtons
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onRemove}
              canReply={canReply}
              canEdit={canEdit}
              canDelete={canDelete}
              labels={actionLabels}
              buttonClassName="h-7 w-7"
              activateOnPointerDown={enableCollapse}
            />
          </div>
        )}
      </Card>
    </div>
  )
}
