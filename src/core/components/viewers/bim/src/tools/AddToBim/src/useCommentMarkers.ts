"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useSession } from "next-auth/react"
import * as React from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js"

import { useComments, useDeleteComments } from "../../../../../../../hooks/comments/comments"
import { HooksCtx, useCoreHooks, type HooksBag } from "../../../../../../../hooks/provider"
import { useUsers } from "../../../../../../../hooks/users/users"
import { MenusContext } from "../../../../../../../store"
import { ViewerNames } from "../../../../../../../types/dbTypes"

import BimComment from "./BimComment"
import BimCommentCluster from "./BimCommentCluster"
import { clusterMarkersByScreenSpace } from "./clusterMarkersByScreenSpace"
import { computeCommentLookAt } from "./commentCameraUtils"
import { renderCSS2DMarkers, type MarkerRef } from "./renderCSS2DMarkers"

type ClusterMarkerRef = { root: ReturnType<typeof createRoot>; css2dObject: CSS2DObject }

interface RenderState {
  world: any
  /** Non-pending BIM comments eligible for clustering. */
  items: any[]
  /** Pending (being-created) markers — always rendered as singles. */
  pending: any[]
  isVisible: boolean
  currentCommentId: number | null
  focusedCommentId: number | null
  currentUserId: string | null
  coreHooks: HooksBag | null
  onRemove: (id: number) => void
  onSelect: (id: number) => void
  onFocus: (id: number) => void
  onEdit: (id: number) => void
  onReply: (id: number) => void
}

/** Builds the per-comment props for the shared `Comment` card, gating edit/delete by author. */
function makeCommentPropsMapper(state: RenderState) {
  const { currentCommentId, focusedCommentId, currentUserId, onSelect, onFocus, onEdit, onReply, onRemove } = state
  return (comment: any) => {
    const base = {
      userName: comment.authorName,
      userImageFileId: comment.imageFileId ?? null,
      userImage: comment.imageFileId ?? null,
      buildingId: comment.buildingId,
      timestamp: new Date(comment.createdAt),
      text: comment.text,
      isPending: comment.isPending || false,
      highlight: currentCommentId === comment.id,
      focused: focusedCommentId === comment.id,
    }
    if (comment.isPending) return base

    const isAuthor = currentUserId != null && String(comment.authorId) === currentUserId
    return {
      ...base,
      showActions: true,
      canEdit: isAuthor,
      canDelete: isAuthor,
      onSelect: () => onSelect(comment.id),
      onFocus: () => onFocus(comment.id),
      onReply: () => onReply(comment.id),
      onEdit: isAuthor ? () => onEdit(comment.id) : undefined,
      onRemove: isAuthor ? () => onRemove(comment.id) : undefined,
    }
  }
}

function clearSingles(world: any, registry: React.MutableRefObject<Map<string, MarkerRef>>) {
  renderCSS2DMarkers(world, {
    items: [],
    markerIdKey: "commentId",
    registry,
    component: BimComment,
    propsMapper: () => ({}),
    sphereColor: "white",
    isVisible: false,
    onRemove: () => {},
  })
}

function clearClusters(world: any, registry: React.MutableRefObject<Map<string, ClusterMarkerRef>>) {
  registry.current.forEach(({ root, css2dObject }) => {
    world.scene.three.remove(css2dObject)
    const el = css2dObject.element as HTMLElement | undefined
    el?.remove()
    root.unmount()
  })
  registry.current.clear()
}

/**
 * Imperative render driven by a rAF loop. Recomputes screen-space clustering
 * from the current camera and only rebuilds DOM when the layout/data signature
 * changes (individual CSS2DObjects already track the camera every frame).
 */
function renderMarkers(
  state: RenderState,
  singleRegistry: React.MutableRefObject<Map<string, MarkerRef>>,
  clusterRegistry: React.MutableRefObject<Map<string, ClusterMarkerRef>>,
  lastSignatureRef: React.MutableRefObject<string>,
) {
  const { world, items, pending, isVisible, currentCommentId, focusedCommentId, coreHooks, onRemove, onSelect, onFocus } = state
  if (!world) return

  if (!isVisible) {
    if (lastSignatureRef.current === "hidden") return
    clearSingles(world, singleRegistry)
    clearClusters(world, clusterRegistry)
    lastSignatureRef.current = "hidden"
    return
  }

  const camera = world.camera?.three
  const dom = world.renderer?.three?.domElement
  if (!camera || !dom) return

  const width = dom.clientWidth || dom.width || 0
  const height = dom.clientHeight || dom.height || 0
  if (!width || !height) return

  const { clusters, singles } = clusterMarkersByScreenSpace(items, camera, width, height, 44)
  const singleItems = [...singles, ...pending]

  const clusterKeys = clusters.map((c) => c.key)
  const dataHash = [...items, ...pending]
    .map((c) => `${c.id}:${c.text ?? ""}:${c.isPending ? 1 : 0}`)
    .join(";")
  const signature =
    `v2|${currentCommentId}|${focusedCommentId}|C:${clusterKeys.join(",")}` +
    `|S:${singleItems.map((s) => s.id).join(",")}|D:${dataHash}`
  if (signature === lastSignatureRef.current) return
  lastSignatureRef.current = signature

  // Singles (including pending) via the shared per-marker renderer
  renderCSS2DMarkers(world, {
    items: singleItems,
    markerIdKey: "commentId",
    registry: singleRegistry,
    component: BimComment,
    hooksContextValue: coreHooks,
    propsMapper: makeCommentPropsMapper(state),
    sphereColor: "white",
    isVisible: true,
    onRemove,
  })

  // Float the highlighted/focused marker above overlapping ones. The CSS2D renderer sorts by
  // renderOrder first (then camera distance), so this makes a selected comment that sits behind
  // nearer markers come to the front — visible and clickable instead of buried.
  singleRegistry.current.forEach((ref, id) => {
    const nid = Number(id)
    ref.css2dObject.renderOrder = nid === currentCommentId || nid === focusedCommentId ? 1 : 0
  })

  // Cluster bubbles, managed imperatively
  const reg = clusterRegistry.current
  const wanted = new Set(clusterKeys)
  for (const [key, ref] of reg) {
    if (!wanted.has(key)) {
      world.scene.three.remove(ref.css2dObject)
      const el = ref.css2dObject.element as HTMLElement | undefined
      el?.remove()
      ref.root.unmount()
      reg.delete(key)
    }
  }

  for (const cluster of clusters) {
    const members = cluster.members.map((m) => ({
      id: m.id,
      userName: m.authorName,
      imageFileId: m.imageFileId ?? null,
    }))
    const highlight = currentCommentId != null && members.some((m) => m.id === currentCommentId)
    const element = React.createElement(BimCommentCluster, { members, highlight, onSelect, onFocus })
    const wrapped = coreHooks
      ? React.createElement(HooksCtx.Provider, { value: coreHooks }, element)
      : element

    const existing = reg.get(cluster.key)
    if (existing) {
      existing.root.render(wrapped)
      existing.css2dObject.position.set(cluster.worldCenter.x, cluster.worldCenter.y + 0.2, cluster.worldCenter.z)
      existing.css2dObject.renderOrder = highlight ? 1 : 0
      continue
    }

    const labelDiv = document.createElement("div")
    labelDiv.style.pointerEvents = "auto"
    const root = createRoot(labelDiv)
    root.render(wrapped)

    const css2dObject = new CSS2DObject(labelDiv)
    css2dObject.position.set(cluster.worldCenter.x, cluster.worldCenter.y + 0.2, cluster.worldCenter.z)
    css2dObject.element.style.pointerEvents = "auto"
    css2dObject.renderOrder = highlight ? 1 : 0
    world.scene.three.add(css2dObject)

    reg.set(cluster.key, { root, css2dObject })
  }
}

export function useCommentMarkers(world: any, buildingId: number) {
  const { state: menusState, dispatch: menusDispatch, setIsSidebarOpen } = React.useContext(MenusContext)
  const { commentsVisibleInViewer, currentCommentId, focusedCommentId, focusRequestId } = menusState.menus

  const singleRegistry = React.useRef<Map<string, MarkerRef>>(new Map())
  const clusterRegistry = React.useRef<Map<string, ClusterMarkerRef>>(new Map())
  const lastSignatureRef = React.useRef<string>("")
  const stateRef = React.useRef<RenderState | null>(null)
  const commentsRef = React.useRef<any[]>([])

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

  commentsRef.current = eligibleComments

  const handleRemoveComment = React.useCallback((commentId: number) => {
    // Cascade: remove the comment and any replies (the DB self-relation does not cascade).
    const replyIds = comments.filter((c) => c.replyToId === commentId).map((c) => c.id)
    void deleteComments({ ids: [commentId, ...replyIds] })
  }, [comments, deleteComments])

  const handleSelectComment = React.useCallback((commentId: number) => {
    menusDispatch({ type: "SET_CURRENT_COMMENT_ID", payload: { commentId } })
  }, [menusDispatch])

  const handleFocusComment = React.useCallback((commentId: number) => {
    menusDispatch({ type: "SET_CURRENT_COMMENT_ID", payload: { commentId } })
    menusDispatch({ type: "SET_FOCUSED_COMMENT_ID", payload: { commentId } })
  }, [menusDispatch])

  // Edit/reply on the 3D card open the comment's editor/reply box in the sidebar.
  const requestSidebarAction = React.useCallback((commentId: number, action: 'edit' | 'reply') => {
    setIsSidebarOpen(true)
    menusDispatch({ type: "SET_SIDEBAR_SELECTED_TAB", payload: { selectedTab: 'communication' } })
    menusDispatch({ type: "SET_CURRENT_COMMENT_ID", payload: { commentId } })
    menusDispatch({ type: "REQUEST_COMMENT_ACTION", payload: { commentId, action } })
  }, [menusDispatch, setIsSidebarOpen])

  const handleEditComment = React.useCallback((commentId: number) => {
    requestSidebarAction(commentId, 'edit')
  }, [requestSidebarAction])

  const handleReplyComment = React.useCallback((commentId: number) => {
    requestSidebarAction(commentId, 'reply')
  }, [requestSidebarAction])

  // Pending markers for loading indicators while comment is being created
  const [pendingComments, setPendingComments] = React.useState<Array<{ id: number; x: number; y: number; z: number }>>([])

  const addPendingComment = React.useCallback((position: { x: number; y: number; z: number }) => {
    const id = -Date.now()
    setPendingComments((prev) => [...prev, { id, ...position }])
    return id
  }, [])

  const removePendingComment = React.useCallback((id: number) => {
    setPendingComments((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const isVisible = commentsVisibleInViewer?.includes(ViewerNames.bim) ?? false

  // Keep the latest inputs available to the rAF render loop (avoids stale closures)
  stateRef.current = {
    world,
    items: eligibleComments.map((c) => ({ ...c, isPending: false })),
    pending: pendingComments.map((p) => ({
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
    isVisible,
    currentCommentId,
    focusedCommentId,
    currentUserId,
    coreHooks,
    onRemove: handleRemoveComment,
    onSelect: handleSelectComment,
    onFocus: handleFocusComment,
    onEdit: handleEditComment,
    onReply: handleReplyComment,
  }

  React.useEffect(() => {
    if (!world) return
    let raf = 0
    let frame = 0
    const loop = () => {
      // Recompute at most every other frame; renderMarkers no-ops unless the
      // cluster layout or data actually changed.
      if ((frame++ & 1) === 0 && stateRef.current) {
        renderMarkers(stateRef.current, singleRegistry, clusterRegistry, lastSignatureRef)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      clearClusters(world, clusterRegistry)
      clearSingles(world, singleRegistry)
      lastSignatureRef.current = ""
    }
  }, [world])

  // Zoom to a comment when it is focused (double-clicked here or in the sidebar).
  React.useEffect(() => {
    if (focusedCommentId == null || !world) return
    const target = commentsRef.current.find((c) => c.id === focusedCommentId)
    if (!target || target.x == null || target.y == null || target.z == null) return
    const controls = world.camera?.controls
    if (!controls) return

    const camPos = controls.getPosition(new THREE.Vector3())
    const camTarget = controls.getTarget(new THREE.Vector3())
    const lookAt = computeCommentLookAt(
      { x: camPos.x, y: camPos.y, z: camPos.z },
      { x: camTarget.x, y: camTarget.y, z: camTarget.z },
      { x: target.x, y: target.y, z: target.z },
    )
    void controls.setLookAt(lookAt.camX, lookAt.camY, lookAt.camZ, lookAt.tarX, lookAt.tarY, lookAt.tarZ, true)
  }, [focusRequestId, world])

  const commentCount = comments.filter(
    (c) => c.viewer === ViewerNames.bim && (!buildingId || buildingId === -1 || c.buildingId === buildingId),
  ).length

  return { addPendingComment, removePendingComment, commentCount }
}
