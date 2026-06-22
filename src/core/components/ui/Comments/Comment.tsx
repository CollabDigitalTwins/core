'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import * as LR from 'lucide-react'
import { Avatar } from '../Avatar'
import { Button } from '../Button'
import { Card } from '../Card'
import { formatTimestamp } from '../../../utils/timeUtils'
import { markerStyleHighlight } from '../../../utils/markerUtils'
import { UserAvatar } from '../UserAvatar'
import { useFile } from '../../../hooks/files/files'

export type CommentProps = {
  userName: string
  userImage: number | null
  userImageFileId?: number | null
  buildingId?: number
  text: string
  createdAt: string | Date
  onRemove?: () => void
  onClose?: () => void
  enableCollapse?: boolean
  defaultCollapsed?: boolean
  isPending?: boolean
  highlight?: boolean
}

export default function Comment({
  text,
  createdAt,
  userName,
  userImage,
  userImageFileId,
  onRemove,
  onClose,
  enableCollapse = false,
  defaultCollapsed = false,
  isPending = false,
  highlight = false,
}: CommentProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  const lastTap = React.useRef(0)
  const resolvedImageFileId = userImageFileId ?? userImage
  const { file } = useFile(resolvedImageFileId)
  const previewSrc = file?.url

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!enableCollapse) return
    e.stopPropagation()

    const now = performance.now()
    if (now - lastTap.current < 300) setIsCollapsed(v => !v)
    lastTap.current = now
  }
  if (enableCollapse && isCollapsed) {
    return (
      <div
        className={`h-9 w-9 rounded-full shadow-md overflow-hidden flex-shrink-0 pointer-events-auto ${highlight ? markerStyleHighlight : ''}`}
        onPointerDown={handlePointerDown}
        onDoubleClick={(e) => {
          e.stopPropagation()
          setIsCollapsed(v => !v)
        }}
      >
        {isPending ? (
          <div className="w-full h-full rounded-full bg-primary-light flex items-center justify-center">
            <LR.Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Avatar className="h-full w-full cursor-pointer">
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
      style={{ pointerEvents: 'auto' }}
      title={enableCollapse ? 'Double click to collapse' : undefined}
      onPointerDown={handlePointerDown}
      onDoubleClick={(e) => {
        e.stopPropagation()
        if (enableCollapse) setIsCollapsed(v => !v)
        else onClose?.()
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
          </div>

          <div className="mt-2 flex items-start gap-2">
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
              {text}
            </p>

            {onRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Remove comment"
                    className="z-50 h-7 w-7 shrink-0"
                    aria-label="Remove comment"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove()
                    }}
                  >
                    <LR.Trash2 className="h-4 w-4" />
                  </Button>
            )}
          </div>
        </Card>
    </div>
  )
}
