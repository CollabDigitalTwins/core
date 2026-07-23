'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useUser } from '../../../hooks/users/users'
import { usePermissions } from '../../../store'
import { commentRingShadow } from '../../../utils/markerUtils'
import { formatTimestamp } from '../../../utils/timeUtils'
import { cn } from '../../../utils/utils'
import { Avatar } from '../Avatar'
import { Badge } from '../Badge'
import { Button } from '../Button'
import { Input } from '../Input'
import { UserAvatar } from '../UserAvatar'

import { CommentActionButtons } from './CommentActionButtons'

import type { Comment } from '../../../types/dbTypes'

type CommentAction = 'view' | 'edit' | 'delete' | 'reply'

/** Request from a 3D/map marker to auto-open a comment's editor or reply box. */
export interface PendingCommentAction {
  commentId: number
  action: 'edit' | 'reply'
  requestId: number
}

interface CollapsibleCommentItemProps {
  comment: Comment
  onAction?: (action: CommentAction, id: number) => void
  replies?: Comment[]
  onReply?: (comment: Comment, replyText: string) => void
  onEdit?: (id: number, text: string) => void
  onFileUpload?: (id: number, files: FileList) => void
  attachments?: Array<{ name: string; url: string; size: number }>
  depth?: number
  isVisible?: boolean
  focused?: boolean
  onFocus?: () => void
  pendingAction?: PendingCommentAction
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function CollapsibleCommentItem({
  comment,
  onAction,
  replies = [],
  onReply,
  onEdit,
  onFileUpload,
  depth = 0,
  isVisible = true,
  focused = false,
  onFocus,
  pendingAction,
  onMouseEnter,
  onMouseLeave,
}: CollapsibleCommentItemProps) {
  const t = useTranslations('CommentsSection')
  const { ability } = usePermissions()

  const isReply = depth > 0
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [replyText, setReplyText] = React.useState('')
  const [isEditing, setIsEditing] = React.useState(false)
  const [editText, setEditText] = React.useState(comment.text)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const replyInputRef = React.useRef<HTMLInputElement>(null)
  const prevVisibleRef = React.useRef(isVisible)

  const user = useSession().data?.user
  const isAuthor = user?.id === String(comment.authorId)
  const canReply = ability.can('create', 'Comment')
  const canEdit = ability.can('update', 'Comment')
  const canDelete = ability.can('delete', 'Comment')

  const { user: author } = useUser(String(comment.authorId))
  const authorName: string = author?.name ?? 'Unknown User'

  // Auto-collapse when visibility turns off
  React.useEffect(() => {
    if (prevVisibleRef.current && !isVisible) setIsExpanded(false)
    prevVisibleRef.current = isVisible
  }, [isVisible])

  const handleEditStart = React.useCallback(() => {
    setEditText(comment.text)
    setIsEditing(true)
  }, [comment.text])

  // Reply happens in one place: the input at the end of the thread. The reply button just
  // expands the thread and focuses that input, so users never hunt for a per-comment control.
  const openReply = React.useCallback(() => {
    setIsExpanded(true)
    requestAnimationFrame(() => replyInputRef.current?.focus())
  }, [])

  // Open the editor / reply box when a marker requests it, then scroll into view.
  React.useEffect(() => {
    if (!pendingAction) return
    const matchesSelf = pendingAction.commentId === comment.id
    const matchesReply = replies.some((r) => r.id === pendingAction.commentId)
    if (matchesSelf) {
      if (pendingAction.action === 'edit') handleEditStart()
      else openReply()
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    if (matchesReply) setIsExpanded(true)
  }, [pendingAction?.requestId])

  const handleReplySubmit = () => {
    if (replyText.trim() && onReply) {
      onReply(comment, replyText)
      setReplyText('')
    }
  }

  const handleEditSubmit = () => {
    const next = editText.trim()
    if (next && next !== comment.text && onEdit) onEdit(comment.id, next)
    setIsEditing(false)
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'transition-colors',
        !isReply && 'rounded-md border',
        isReply && 'pt-2'
      )}
      style={focused ? { boxShadow: commentRingShadow({ focused: true }), borderColor: 'transparent' } : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onFocus?.()
      }}
      title={onFocus ? t('doubleClickZoom') : undefined}
    >
      <div className={cn('flex flex-col gap-1.5 p-3', !isReply && 'hover:bg-accent/50 transition-colors rounded-md', onFocus && 'cursor-pointer')}>
        {/* Header: avatar, author, timestamp, actions */}
        <div className="flex items-start gap-2">
          <Avatar className={cn('mt-0.5 rounded-full overflow-hidden shrink-0', isReply ? 'h-6 w-6' : 'h-8 w-8')}>
            <UserAvatar imageFileId={author?.imageFileId} name={authorName} />
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">{authorName}</span>
              {comment.updatedAt !== comment.createdAt && (
                <Badge variant="outline" className="text-xs">{t('edited')}</Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                {formatTimestamp(comment.createdAt)}
              </span>
            </div>
          </div>

          {onAction && (
            <CommentActionButtons
              // Replies are single-level, so only top-level comments expose a reply control.
              onReply={!isReply && onReply ? openReply : undefined}
              onEdit={isAuthor ? handleEditStart : undefined}
              onDelete={isAuthor ? () => onAction('delete', comment.id) : undefined}
              canReply={canReply}
              canEdit={canEdit}
              canDelete={canDelete}
              labels={{ reply: t('replyToComment'), edit: t('editComment'), delete: t('deleteComment') }}
            />
          )}
        </div>

        {/* Body: full text (shown once) or inline editor */}
        {isEditing ? (
          <div className="flex gap-2" onDoubleClick={(e) => e.stopPropagation()}>
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="flex-1 h-8"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleEditSubmit()
                }
                if (e.key === 'Escape') setIsEditing(false)
              }}
              disabled={!canEdit}
            />
            <Button size="icon" className="h-8 w-8 p-0" onClick={handleEditSubmit} disabled={!editText.trim() || !canEdit}>
              <LR.Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 p-0" onClick={() => setIsEditing(false)}>
              <LR.X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{comment.text}</p>
        )}

        {/* Replies toggle (top-level only) */}
        {!isReply && replies.length > 0 && (
          <button
            type="button"
            className="flex items-center gap-1 w-fit text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setIsExpanded((v) => !v)}
          >
            <LR.ChevronRight className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-90')} />
            {replies.length} {replies.length === 1 ? t('reply') : t('replies')}
          </button>
        )}
      </div>

      {/* Nested replies thread + single reply input at the end */}
      {!isReply && isExpanded && (
        <div className="ml-5 border-l border-border pl-1 pr-2 pb-2">
          {replies.map((reply) => (
            <CollapsibleCommentItem
              key={reply.id}
              comment={reply}
              onAction={onAction}
              onReply={onReply}
              onEdit={onEdit}
              onFileUpload={onFileUpload}
              depth={depth + 1}
              pendingAction={pendingAction}
            />
          ))}

          {onReply && (
            <div className="flex gap-2 px-1 pt-2" onDoubleClick={(e) => e.stopPropagation()}>
              <Input
                ref={replyInputRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('writeReply')}
                className="flex-1 h-8"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleReplySubmit()
                  }
                }}
                disabled={!canReply}
              />
              <Button size="icon" className="h-8 w-8 p-0" onClick={handleReplySubmit} disabled={!replyText.trim() || !canReply}>
                <LR.Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
