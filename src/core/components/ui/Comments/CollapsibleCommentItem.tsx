'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { usePermissions } from '../../../store'

import { Button } from '../Button'
import { Badge } from '../Badge'
import { Input } from '../Input'
import { Avatar } from '../Avatar'
import { UserAvatar } from '../UserAvatar'
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { cn } from '../../../utils/utils'
import { Comment } from '../../../types/dbTypes'
import { useUser } from '../../../hooks/users/users'
import { useSession } from 'next-auth/react'

type CommentAction = 'view' | 'edit' | 'delete' | 'reply'

interface CollapsibleCommentItemProps {
  comment: Comment
  onAction?: (action: CommentAction, id: number) => void
  replies?: Comment[]
  onReply?: (id: number, replyText: string | number) => void
  onFileUpload?: (id: number, files: FileList) => void
  attachments?: Array<{ name: string; url: string; size: number }>
  depth?: number
  isVisible?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function CollapsibleCommentItem({
  comment,
  onAction,
  replies = [],
  onReply,
  onFileUpload,
  attachments = [],
  depth = 0,
  isVisible = true,
  onMouseEnter,
  onMouseLeave
}: CollapsibleCommentItemProps) {
  const t = useTranslations('CommentsSection')
  // Permissions
  const { ability } = usePermissions()

  const [isExpanded, setIsExpanded] = React.useState(false)
  const [showReplyInput, setShowReplyInput] = React.useState(false)
  const [replyText, setReplyText] = React.useState('')
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const prevVisibleRef = React.useRef(isVisible)

  const user = useSession().data?.user

  // Auto-collapse when visibility turns off
  React.useEffect(() => {
    const prevVisible = prevVisibleRef.current

    if (prevVisible && !isVisible) {
      // Just turned invisible - collapse
      setIsExpanded(false)
    }

    prevVisibleRef.current = isVisible
  }, [isVisible])

  const handleReplySubmit = () => {
    if (replyText.trim() && onReply) {
      onReply(comment.id, replyText)
      setReplyText('')
      setShowReplyInput(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0 && onFileUpload) {
      onFileUpload(comment.id, event.target.files)
      event.target.value = ''
    }
  }

  const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 12)}` : ''

  const { user: author } = useUser(String(comment.authorId))
  const authorName: string | undefined = author?.name ?? 'Unknown User'

  return (
    <div
      className={cn(
        "border rounded-md overflow-hidden transition-opacity",
        indentClass,
        // !isVisible && "opacity-50"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Comment Header */}
      <div className="flex items-start justify-between p-3 hover:bg-accent/50 transition-colors">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-6 w-6 p-0 mt-1")}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <LR.ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </Button>

          <Avatar className={cn("h-8 w-8 mt-1 rounded-full overflow-hidden")}>
            <UserAvatar imageFileId={author?.imageFileId} name={authorName} />
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                <span className={cn("text-sm font-medium text-foreground ")}>
                {authorName}
              </span>
              {comment.updatedAt !== comment.createdAt && (
                <Badge variant="outline" className="text-xs">
                  {t('edited')}
                </Badge>
              )}
            </div>
              <p className={cn("text-sm mt-1 line-clamp-1 text-foreground")}>
              {comment.text}
            </p>
            {replies.length > 0 && !isExpanded && (
              <span className="text-xs text-muted-foreground mt-1">
                {replies.length} {replies.length === 1 ? t('reply') : t('replies')}
              </span>
            )}
          </div>
        </div>

      {/* Action Buttons */}
      {onAction && (
        <div className={cn("flex items-center gap-0 flex-shrink-0")}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            onClick={() => setShowReplyInput(!showReplyInput)}
            title={t('replyToComment')}
            disabled={!ability.can('create', 'Comment')}
          >
            <LR.Reply className="h-4 w-4" />
          </Button>
          {user?.id === String(comment.authorId) && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0"
                onClick={() => onAction('edit', comment.id)}
                title={t('editComment')}
                disabled={!ability.can('update', 'Comment')}
              >
                <LR.Pencil className="h-4 w-4" />
              </Button>
              {/* TODO: Need 2-step confirmation dialog for DELETE COMMENT */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0"
                onClick={() => onAction('delete', comment.id)}
                title={t('deleteComment')}
                disabled={!ability.can('delete', 'Comment')}

              >
                <LR.Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>

      {/* Expanded Content */ }
  {
    isExpanded && (
      <div className="border-t bg-muted/30">
        <div className="p-4 space-y-4">
          {/* Full Comment Text */}
          <span className="text-xs text-muted-foreground">
            {format(new Date(comment.createdAt), 'PPp')}
          </span>
          <div>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {comment.text}
            </p>
          </div>
        </div>
      </div>
    )
  }

  {/* Reply Input */ }
  {
    showReplyInput && onReply && (
      <div className="border-t p-3 bg-muted/20">
        <div className="flex gap-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={t('writeReply')}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleReplySubmit()
              }
            }}
            disabled={!ability.can('create', 'Comment')}
          />
          <Button
            size="sm"
            onClick={handleReplySubmit}
            disabled={!replyText.trim() || !ability.can('create', 'Comment')}
          >
            <LR.Send className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowReplyInput(false)
              setReplyText('')
            }}
            disabled={!ability.can('create', 'Comment')}
          >
            <LR.X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  {/* Nested Replies */ }
  {
    isExpanded && replies.length > 0 && (
      <div className="border-t">
        {replies.map((reply) => (
          <CollapsibleCommentItem
            key={reply.id}
            comment={reply}
            onAction={onAction}
            onReply={onReply}
            onFileUpload={onFileUpload}
            depth={depth + 1}
          />
        ))}
      </div>
    )
  }
    </div >
  )
}
