"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useSession } from "next-auth/react"
import * as React from "react"

import { useComments, useDeleteComments } from "../../../../../../../hooks/comments/comments"
import { useCoreHooks } from "../../../../../../../hooks/provider"
import { useUsers } from "../../../../../../../hooks/users/users"
import { MenusContext } from "../../../../../../../store"
import { ViewerNames } from "../../../../../../../types/dbTypes"
import { useMarkerLayerBim } from "../../../../../shared/markers/useMarkerLayerBim"

import { makeCommentMarkerConfig, type CommentItem } from "./commentMarkerConfig"

import type { MarkerStoreAdapter } from "../../../../../shared/markers/types"

/**
 * Thin wrapper over the generic `useMarkerLayerBim`: owns comment data fetching, the
 * author-cascade delete, and the sidebar reply/edit handoff, then hands rendering off to the
 * shared marker layer via `commentMarkerConfig`. Signature and return shape are unchanged —
 * `AddToBim/index.tsx` consumes `{ addPendingComment, removePendingComment, commentCount }`.
 */
export function useCommentMarkers(world: any, buildingId: number) {
  const { state: menusState, dispatch: menusDispatch, setIsSidebarOpen } = React.useContext(MenusContext)
  const { commentsVisibleInViewer, currentCommentId, focusedCommentId, focusRequestId } = menusState.menus

  const { comments } = useComments()
  const { users } = useUsers()
  const coreHooks = useCoreHooks()
  const currentUserId = useSession().data?.user?.id ?? null
  const { deleteComments } = useDeleteComments()

  const eligibleComments = comments
    .filter((comment) => {
      const { x, y, z, viewer } = comment
      if (x == null || y == null || z == null) return false
      if (viewer !== ViewerNames.bim) return false
      if (buildingId !== -1 && comment.buildingId !== buildingId) return false
      return true
    })
    .map((comment) => {
      const user = users.find((u) => u.id === comment.authorId)
      return {
        ...comment,
        authorName: user?.name ?? "Unknown User",
        imageFileId: user?.imageFileId ?? null,
        image: user?.imageFileId ?? null,
      }
    })

  const handleRemoveComment = React.useCallback((commentId: number) => {
    // Cascade: remove the comment and any replies (the DB self-relation does not cascade).
    const replyIds = comments.filter((c) => c.replyToId === commentId).map((c) => c.id)
    void deleteComments({ ids: [commentId, ...replyIds] })
  }, [comments, deleteComments])

  // Edit/reply on the 3D card open the comment's editor/reply box in the sidebar.
  const requestSidebarAction = React.useCallback((commentId: number, action: 'edit' | 'reply') => {
    setIsSidebarOpen(true)
    menusDispatch({ type: "SET_SIDEBAR_SELECTED_TAB", payload: { selectedTab: 'communication' } })
    menusDispatch({ type: "SET_CURRENT_COMMENT_ID", payload: { commentId } })
    menusDispatch({ type: "REQUEST_COMMENT_ACTION", payload: { commentId, action } })
  }, [menusDispatch, setIsSidebarOpen])

  const handleReplyComment = React.useCallback((commentId: number) => {
    requestSidebarAction(commentId, 'reply')
  }, [requestSidebarAction])

  const store: MarkerStoreAdapter = {
    currentId: currentCommentId,
    focusedId: focusedCommentId,
    focusRequestId,
    setCurrentId: (id) => menusDispatch({ type: "SET_CURRENT_COMMENT_ID", payload: { commentId: id } }),
    setFocusedId: (id) => {
      menusDispatch({ type: "SET_CURRENT_COMMENT_ID", payload: { commentId: id } })
      menusDispatch({ type: "SET_FOCUSED_COMMENT_ID", payload: { commentId: id } })
    },
    requestEdit: (id) => requestSidebarAction(id, 'edit'),
  }

  const config = makeCommentMarkerConfig({
    currentUserId,
    onRemove: handleRemoveComment,
    onReply: handleReplyComment,
    buildingId,
  })

  // Non-pending items eligible for clustering; pending (being-created) items are synthesized by
  // `config.makePendingItem` inside `useMarkerLayerBim` itself.
  // Cast: `eligibleComments` is filtered above to guarantee non-null x/y/z, which `CommentItem`
  // requires as plain numbers — not provable to tsc through the filter + map chain.
  const itemsForLayer = eligibleComments.map((c) => ({ ...c, isPending: false })) as CommentItem[]

  const { addPending, removePending } = useMarkerLayerBim(world, itemsForLayer, {
    isVisible: commentsVisibleInViewer?.includes(ViewerNames.bim) ?? false,
    store,
    coreHooks,
    config,
  })

  const commentCount = comments.filter(
    (c) => c.viewer === ViewerNames.bim && (!buildingId || buildingId === -1 || c.buildingId === buildingId),
  ).length

  return { addPendingComment: addPending, removePendingComment: removePending, commentCount }
}
