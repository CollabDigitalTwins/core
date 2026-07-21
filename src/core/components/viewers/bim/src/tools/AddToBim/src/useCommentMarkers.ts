"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react"

import { useComments, useComment } from "../../../../../../../hooks/comments/comments"
import { useCoreHooks } from "../../../../../../../hooks/provider"
import { useUsers } from "../../../../../../../hooks/users/users"
import { MenusContext } from "../../../../../../../store"
import { ViewerNames } from "../../../../../../../types/dbTypes"

import BimComment from "./BimComment"
import { renderCSS2DMarkers, type MarkerRef } from "./renderCSS2DMarkers"

export function useCommentMarkers(world: any, buildingId: number) {
  const { state: menusState } = React.useContext(MenusContext)
  const { commentsVisibleInViewer, currentCommentId } = menusState.menus

  const registry = React.useRef<Map<string, MarkerRef>>(new Map())

  const { comments } = useComments()
  const { users } = useUsers()
  const coreHooks = useCoreHooks()

  const [commentToDelete, setCommentToDelete] = React.useState<number | null>(null)
  const { deleteComment } = useComment(commentToDelete)

  const eligibleComments = comments
    .filter((comment) => {
      const { x, y, z, viewer } = comment
      if (x == null || y == null || z == null) return false
      if (viewer !== ViewerNames.bim) return false
      if (buildingId !== -1 && comment.buildingId !== buildingId) return false
      return true
    })
    .map((comment) => {
      const user = users.find(u => u.id === comment.authorId)
      return {
        ...comment,
        authorName: user?.name ?? "Unknown User",
        imageFileId: user?.imageFileId ?? null,
        image: user?.imageFileId ?? null,
      }
    })

  React.useEffect(() => {
    if (commentToDelete !== null) {
      deleteComment()
      setCommentToDelete(null)
    }
  }, [commentToDelete, deleteComment])

  const handleRemoveComment = React.useCallback((commentId: number) => {
    setCommentToDelete(commentId)
  }, [])

  // Pending markers for loading indicators while comment is being created
  const [pendingComments, setPendingComments] = React.useState<Array<{ id: number; x: number; y: number; z: number }>>([])

  const addPendingComment = React.useCallback((position: { x: number; y: number; z: number }) => {
    const id = -Date.now()
    setPendingComments(prev => [...prev, { id, ...position }])
    return id
  }, [])

  const removePendingComment = React.useCallback((id: number) => {
    setPendingComments(prev => prev.filter(p => p.id !== id))
  }, [])

  // Render comment markers (including pending)
  React.useEffect(() => {
    const isVisible = commentsVisibleInViewer?.includes(ViewerNames.bim) ?? false

    const allComments = [
      ...eligibleComments.map(c => ({ ...c, isPending: false })),
      ...pendingComments.map(p => ({
        id: p.id,
        x: p.x,
        y: p.y,
        z: p.z,
        authorName: "Loading...",
        imageFileId: null,
        image: "",
        text: "Creating comment...",
        createdAt: new Date().toISOString(),
        buildingId,
        isPending: true,
      })),
    ]

    renderCSS2DMarkers(world, {
      items: allComments,
      markerIdKey: "commentId",
      registry,
      component: BimComment,
      hooksContextValue: coreHooks,
      propsMapper: (comment) => ({
        userName: comment.authorName,
        userImageFileId: comment.imageFileId ?? null,
        userImage: comment.imageFileId ?? null,
        buildingId: comment.buildingId,
        timestamp: new Date(comment.createdAt),
        text: comment.text,
        isPending: comment.isPending || false,
        highlight: currentCommentId === comment.id,
      }),
      sphereColor: "white",
      isVisible,
      onRemove: handleRemoveComment,
    })
  }, [world, eligibleComments, pendingComments, handleRemoveComment, commentsVisibleInViewer, buildingId, currentCommentId, coreHooks])

  const commentCount = comments.filter(
    c => c.viewer === ViewerNames.bim && (!buildingId || buildingId === -1 || c.buildingId === buildingId)
  ).length

  return { addPendingComment, removePendingComment, commentCount }
}
