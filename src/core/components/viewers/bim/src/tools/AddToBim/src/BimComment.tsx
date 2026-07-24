'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import Comment from '../../../../../../ui/Comments/Comment'

import type { CommentActionLabels } from '../../../../../../ui/Comments/CommentActionButtons'

interface BimCommentProps {
  userName: string
  userImage: number | null
  userImageFileId?: number | null
  buildingId?: number
  timestamp: Date
  text: string
  isPending?: boolean
  highlight?: boolean
  focused?: boolean
  showActions?: boolean
  canReply?: boolean
  canEdit?: boolean
  canDelete?: boolean
  actionLabels?: CommentActionLabels
  onRemove?: () => void
  onClose?: () => void
  onSelect?: () => void
  onFocus?: () => void
  onReply?: () => void
  onEdit?: () => void
}

export default function BimComment({
  userName,
  userImage,
  userImageFileId,
  buildingId,
  timestamp,
  text,
  isPending = false,
  highlight = false,
  focused = false,
  showActions = false,
  canReply = true,
  canEdit = true,
  canDelete = true,
  actionLabels,
  onRemove,
  onClose,
  onSelect,
  onFocus,
  onReply,
  onEdit,
}: BimCommentProps): React.ReactElement {
  return (
    <Comment
      userName={userName}
      userImage={userImage}
      userImageFileId={userImageFileId}
      buildingId={buildingId}
      text={text}
      createdAt={timestamp}
      isPending={isPending}
      highlight={highlight}
      focused={focused}
      showActions={showActions}
      canReply={canReply}
      canEdit={canEdit}
      canDelete={canDelete}
      actionLabels={actionLabels}
      onRemove={onRemove}
      onClose={onClose}
      onSelect={onSelect}
      onFocus={onFocus}
      onReply={onReply}
      onEdit={onEdit}
      enableCollapse
      defaultCollapsed
    />
  )
}
