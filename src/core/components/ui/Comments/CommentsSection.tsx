'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { useComment, useComments, useCreateComment, useDeleteComments } from '../../../hooks/comments/comments';
import { BuildingsContext, MenusContext, ToolsContext, usePermissions } from '../../../store'
import { CollapsibleSection } from '../CollapsibleSection'
import { SearchInput } from '../SearchInput'


import { CollapsibleCommentItem } from './CollapsibleCommentItem'

import type { Comment } from '../../../types/dbTypes'



type CommentAction = 'view' | 'edit' | 'delete' | 'reply'

export function CommentsSection() {
  // Translation
  const t = useTranslations('CommentsSection')
  // Permissions
  const { ability } = usePermissions()

  const { dispatch: toolsDispatch } = React.useContext(ToolsContext)
  const { state: menusState, dispatch: menusDispatch } = React.useContext(MenusContext)
  const { currentViewer, commentsVisibleInViewer, focusedCommentId, pendingCommentAction } = menusState.menus

  const focusComment = React.useCallback((commentId: number) => {
    // Ensure comments are visible in the active viewer so the zoom target is actually rendered.
    menusDispatch({ type: 'SHOW_COMMENTS_IN_VIEWER', payload: { viewer: currentViewer } })
    menusDispatch({ type: 'SET_FOCUSED_COMMENT_ID', payload: { commentId } })
  }, [menusDispatch, currentViewer])

  // A pending action (open editor/reply from a marker) is one-shot: child items consume it
  // on their mount/update effect (children run before this parent effect), then we clear it so
  // it does not re-fire when the sidebar remounts.
  React.useEffect(() => {
    if (pendingCommentAction) menusDispatch({ type: 'CLEAR_PENDING_COMMENT_ACTION' })
  }, [pendingCommentAction?.requestId, menusDispatch])

  const {comments} = useComments()
  const {state: buildingsState} = React.useContext(BuildingsContext)
  const buildingId = buildingsState?.buildings?.building?.id || -1

  const user = useSession().data?.user
  const { createComment } = useCreateComment()

  const [commentToEdit, setCommentToEdit] = React.useState<{ id: number; text: string } | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const { updateComment } = useComment(commentToEdit?.id ?? null)
  const { deleteComments } = useDeleteComments()

  const handleAddComment = React.useCallback(() => {
    if (!currentViewer) return
      toolsDispatch({
        type: 'SET-TOOL',
        payload: {
          currentToolId:
            currentViewer === 'bim'
              ? 'bim-add-comment'
              : currentViewer === 'map'
                ? 'map-add-comment'
                : undefined,
        },
      })
  }, [toolsDispatch, currentViewer])

  const handleCommentAction = React.useCallback((action: CommentAction, id: number) => {
    switch (action) {
      case 'delete': {
        toast.success(t('commentDeleted'))
        // Cascade: delete the comment together with its replies (DB does not cascade).
        const replyIds = comments.filter((c) => c.replyToId === id).map((c) => c.id)
        void deleteComments({ ids: [id, ...replyIds] })
        break
      }
      // 'view', 'edit' and 'reply' are handled inline by CollapsibleCommentItem
      // (edit -> onEdit, reply -> onReply)
      default:
        break
    }
  }, [t, comments, deleteComments])

  // Trigger edit when commentToEdit changes
  React.useEffect(() => {
    if (commentToEdit !== null) {
      void updateComment({ text: commentToEdit.text })
      setCommentToEdit(null)
    }
  }, [commentToEdit, updateComment])

  const handleEdit = React.useCallback((id: number, text: string) => {
    setCommentToEdit({ id, text })
  }, [])

  const handleReply = React.useCallback((parent: Comment, replyText: string) => {
    if (!replyText.trim() || !user) return
    void createComment({
      commentData: {
        text: replyText,
        authorId: Number(user.id),
        organizationId: user.organizationId,
        viewer: parent.viewer,
        buildingId: parent.buildingId,
        // Flat threading: a reply to a reply attaches to the top-level parent
        replyToId: parent.replyToId ?? parent.id,
        visible: true,
      },
    })
  }, [createComment, user])

  const handleFileUpload = React.useCallback((commentId: number, files: FileList) => {
    // ⚠️ Comment file upload not implemented (files are discarded)
  }, [])

  const currentComments = comments.filter((comment) => currentViewer === comment.viewer && (!comment.buildingId || comment.buildingId === buildingId))

  // Group replies under their parent (flat, single level)
  const repliesByParent = React.useMemo(() => {
    const map = new Map<number, Comment[]>()
    for (const comment of currentComments) {
      if (comment.replyToId != null) {
        const list = map.get(comment.replyToId) ?? []
        list.push(comment)
        map.set(comment.replyToId, list)
      }
    }
    return map
  }, [currentComments])

  // Top-level comments only (replies are nested under their parent)
  const topLevelComments = React.useMemo(
    () => currentComments.filter((comment) => comment.replyToId == null),
    [currentComments]
  )

  // Filter comments based on search query
  const filteredComments = React.useMemo(() => {
    if (!searchQuery.trim()) return topLevelComments

    const query = searchQuery.toLowerCase()
    return topLevelComments.filter((comment) =>
      comment.text?.toLowerCase().includes(query)
    )
  }, [topLevelComments, searchQuery])

  const commentsVisible = commentsVisibleInViewer.includes(currentViewer)

  const toggleCommentsVisibility = React.useCallback(() => {
      menusDispatch({
        type: commentsVisible ? 'HIDE_COMMENTS_IN_VIEWER' : 'SHOW_COMMENTS_IN_VIEWER',
        payload: {
          viewer: currentViewer,
        },
      })
  }, [currentViewer, commentsVisible, menusDispatch])

  return (
    <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
      <div className="px-4">
        <SearchInput
          placeholder={t('searchComments')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>
      <CollapsibleSection
        title={t('commentsTitle')}
        icon={LR.MessageCircle}
        className="overflow-y-auto"
        itemCount={filteredComments.length}
        onAddItem={handleAddComment}
        addItemTitle={t('addCommentTitle')}
        switchVariant={{
          checked: commentsVisible,
          onCheckedChange: toggleCommentsVisibility,
        }}
      >
        <div className="space-y-2 mx-2 pr-2 pb-2">
          {filteredComments.map((comment) => (
            <CollapsibleCommentItem
              key={comment.id}
              comment={comment}
              onAction={handleCommentAction}
              onReply={handleReply}
              onEdit={handleEdit}
              onFileUpload={handleFileUpload}
              replies={repliesByParent.get(comment.id) ?? []}
              attachments={[]}
              isVisible={commentsVisible}
              focused={focusedCommentId === comment.id}
              onFocus={() => focusComment(comment.id)}
              pendingAction={pendingCommentAction ?? undefined}
              onMouseEnter={() => menusDispatch({ type: 'SET_CURRENT_COMMENT_ID', payload: { commentId: comment.id } })}
              onMouseLeave={() => menusDispatch({ type: 'SET_CURRENT_COMMENT_ID', payload: { commentId: null } })}
            />
          ))}
        </div>
      </CollapsibleSection>
    </div>
  )
}
