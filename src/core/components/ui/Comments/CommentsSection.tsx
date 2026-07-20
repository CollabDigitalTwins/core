'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import * as LR from 'lucide-react'
import { BuildingsContext, MenusContext, ToolsContext, usePermissions } from '../../../store'
import { CollapsibleSection } from '../CollapsibleSection'
import { SearchInput } from '../SearchInput'
import { useTranslations } from 'next-intl'
import { CollapsibleCommentItem } from './CollapsibleCommentItem'
import { useComment, useComments } from '../../../hooks/comments/comments';
import { toast } from 'sonner'

type CommentAction = 'view' | 'edit' | 'delete' | 'reply'

export function CommentsSection() {
  // Translation
  const t = useTranslations('CommentsSection')
  // Permissions
  const { ability } = usePermissions()

  const { dispatch: toolsDispatch } = React.useContext(ToolsContext)
  const { state: menusState, dispatch: menusDispatch } = React.useContext(MenusContext)
  const { currentViewer, commentsVisibleInViewer } = menusState.menus

  const {comments} = useComments()
  const {state: buildingsState} = React.useContext(BuildingsContext)
  const buildingId = buildingsState?.buildings?.building?.id || -1

  const [commentToDelete, setCommentToDelete] = React.useState<number | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const { deleteComment } = useComment(commentToDelete)

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
      case 'view':
        console.log(`View comment ${id}`)
        break
      case 'edit':
        console.log(`Edit comment ${id}`)
        break
      case 'delete':
            toast.success(t('commentDeleted'))
            setCommentToDelete(id)
        break
      case 'reply':
        console.log(`Reply to comment ${id}`)
        break
      default:
        break
    }
  }, [t])

  // Trigger deletion when commentToDelete changes
  React.useEffect(() => {
    if (commentToDelete !== null) {
      deleteComment()
      setCommentToDelete(null)
    }
  }, [commentToDelete, deleteComment])

  const handleReply = React.useCallback((id: number, replyText: string) => {
    console.log(`Reply to ${id}: ${replyText}`)
    // TODO: Implement reply functionality
  }, [])

  const handleFileUpload = React.useCallback((commentId: number, files: FileList) => {
    console.log(`Upload files for comment ${commentId}:`, Array.from(files).map(f => f.name))
    // TODO: Implement file upload functionality
  }, [])

  const currentComments = comments.filter((comment) => currentViewer === comment.viewer && (!comment.buildingId || comment.buildingId === buildingId))

  // Filter comments based on search query
  const filteredComments = React.useMemo(() => {
    if (!searchQuery.trim()) return currentComments

    const query = searchQuery.toLowerCase()
    return currentComments.filter((comment) =>
      comment.text?.toLowerCase().includes(query)
    )
  }, [currentComments, searchQuery])

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
        <div className="space-y-2 mx-2 pr-2">
          {filteredComments.map((comment) => (
            <CollapsibleCommentItem
              key={comment.id}
              comment={comment}
              onAction={handleCommentAction}
              onReply={handleReply}
              onFileUpload={handleFileUpload}
              replies={[]}
              attachments={[]}
              isVisible={commentsVisible}
              onMouseEnter={() => menusDispatch({ type: 'SET_CURRENT_COMMENT_ID', payload: { commentId: comment.id } })}
              onMouseLeave={() => menusDispatch({ type: 'SET_CURRENT_COMMENT_ID', payload: { commentId: null } })}
            />
          ))}
        </div>
      </CollapsibleSection>
    </div>
  )
}
