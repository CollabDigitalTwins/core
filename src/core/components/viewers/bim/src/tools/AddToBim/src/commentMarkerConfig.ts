// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { BimMarkerCluster } from "../../../../../shared/markers/BimMarkerCluster"

import BimComment from "./BimComment"

import type { BimMarkerConfig } from "../../../../../shared/markers/types"

/** A BIM comment enriched with author display fields, shaped for the marker layer. */
export interface CommentItem {
  id: number
  x: number
  y: number
  z: number
  /** Omitted on the pending (being-created) placeholder — never read before a comment is real. */
  authorId?: number
  authorName: string
  imageFileId: number | null
  image: number | string | null
  text: string
  createdAt: string | Date
  buildingId?: number | null
  isPending?: boolean
}

interface CommentMarkerDeps {
  currentUserId: string | null
  onRemove: (id: number) => void
  /** Reply is comment-only — the generic marker `ctx` has no reply handler, so the wrapper injects it. */
  onReply: (id: number) => void
  /** Building context closed over for the pending placeholder item. */
  buildingId: number
}

/**
 * Builds the comment-specific `BimMarkerConfig` consumed by `useMarkerLayerBim`. A factory
 * (not a plain object) because `isAuthor`, `onRemove`, `onReply` and the pending placeholder's
 * `buildingId` all need runtime values supplied by the `useCommentMarkers` wrapper.
 */
export function makeCommentMarkerConfig(deps: CommentMarkerDeps): BimMarkerConfig<CommentItem> {
  const { currentUserId, onRemove, onReply, buildingId } = deps

  return {
    markerIdKey: "commentId",
    sphereColor: "white",
    focusDistance: 8,
    component: BimComment,
    clusterComponent: BimMarkerCluster,

    // Exact reproduction of the pre-refactor `makeCommentPropsMapper`. Any user can select/focus/
    // reply to any comment (showActions/onSelect/onFocus/onReply are NOT author-gated) — only
    // canEdit/canDelete/onEdit/onRemove are, matching the original conditional structure.
    propsMapper: (comment, ctx) => {
      const base = {
        userName: comment.authorName,
        userImageFileId: comment.imageFileId ?? null,
        userImage: comment.imageFileId ?? null,
        buildingId: comment.buildingId,
        timestamp: new Date(comment.createdAt),
        text: comment.text,
        isPending: comment.isPending || false,
        highlight: ctx.highlight,
        focused: ctx.focused,
      }
      if (comment.isPending) return base

      return {
        ...base,
        showActions: true,
        canEdit: ctx.isAuthor,
        canDelete: ctx.isAuthor,
        onSelect: ctx.onSelect,
        onFocus: ctx.onFocus,
        onReply: () => onReply(comment.id),
        onEdit: ctx.isAuthor ? ctx.onEdit : undefined,
        onRemove: ctx.isAuthor ? ctx.onRemove : undefined,
      }
    },

    clusterMemberMapper: (c) => ({
      id: c.id,
      userName: c.authorName,
      imageFileId: c.imageFileId ?? null,
    }),

    dataHashPart: (c) => `${c.id}:${c.text ?? ""}:${c.isPending ? 1 : 0}`,

    isAuthor: (c) => currentUserId != null && String(c.authorId) === currentUserId,

    onRemove,

    makePendingItem: (id, pos) => ({
      id,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      authorName: "Loading...",
      imageFileId: null,
      image: "",
      text: "Creating comment...",
      createdAt: new Date().toISOString(),
      buildingId,
      isPending: true,
    }),
  }
}
