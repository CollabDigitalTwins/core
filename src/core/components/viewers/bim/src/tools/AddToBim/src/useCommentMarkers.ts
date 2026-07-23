"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react"
import { createRoot } from "react-dom/client"
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js"

import { useComments, useComment } from "../../../../../../../hooks/comments/comments"
import { HooksCtx, useCoreHooks, type HooksBag } from "../../../../../../../hooks/provider"
import { useUsers } from "../../../../../../../hooks/users/users"
import { MenusContext } from "../../../../../../../store"
import { ViewerNames } from "../../../../../../../types/dbTypes"

import BimComment from "./BimComment"
import BimCommentCluster from "./BimCommentCluster"
import { clusterMarkersByScreenSpace } from "./clusterMarkersByScreenSpace"
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
  coreHooks: HooksBag | null
  onRemove: (id: number) => void
  onSelect: (id: number) => void
}

function bimCommentProps(currentCommentId: number | null) {
  return (comment: any) => ({
    userName: comment.authorName,
    userImageFileId: comment.imageFileId ?? null,
    userImage: comment.imageFileId ?? null,
    buildingId: comment.buildingId,
    timestamp: new Date(comment.createdAt),
    text: comment.text,
    isPending: comment.isPending || false,
    highlight: currentCommentId === comment.id,
  })
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
  const { world, items, pending, isVisible, currentCommentId, coreHooks, onRemove, onSelect } = state
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
    `v1|${currentCommentId}|C:${clusterKeys.join(",")}` +
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
    propsMapper: bimCommentProps(currentCommentId),
    sphereColor: "white",
    isVisible: true,
    onRemove,
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
    const element = React.createElement(BimCommentCluster, { members, highlight, onSelect })
    const wrapped = coreHooks
      ? React.createElement(HooksCtx.Provider, { value: coreHooks }, element)
      : element

    const existing = reg.get(cluster.key)
    if (existing) {
      existing.root.render(wrapped)
      existing.css2dObject.position.set(cluster.worldCenter.x, cluster.worldCenter.y + 0.2, cluster.worldCenter.z)
      continue
    }

    const labelDiv = document.createElement("div")
    labelDiv.style.pointerEvents = "auto"
    const root = createRoot(labelDiv)
    root.render(wrapped)

    const css2dObject = new CSS2DObject(labelDiv)
    css2dObject.position.set(cluster.worldCenter.x, cluster.worldCenter.y + 0.2, cluster.worldCenter.z)
    css2dObject.element.style.pointerEvents = "auto"
    world.scene.three.add(css2dObject)

    reg.set(cluster.key, { root, css2dObject })
  }
}

export function useCommentMarkers(world: any, buildingId: number) {
  const { state: menusState, dispatch: menusDispatch } = React.useContext(MenusContext)
  const { commentsVisibleInViewer, currentCommentId } = menusState.menus

  const singleRegistry = React.useRef<Map<string, MarkerRef>>(new Map())
  const clusterRegistry = React.useRef<Map<string, ClusterMarkerRef>>(new Map())
  const lastSignatureRef = React.useRef<string>("")
  const stateRef = React.useRef<RenderState | null>(null)

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
      const user = users.find((u) => u.id === comment.authorId)
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

  const handleSelectComment = React.useCallback((commentId: number) => {
    menusDispatch({ type: "SET_CURRENT_COMMENT_ID", payload: { commentId } })
  }, [menusDispatch])

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
    coreHooks,
    onRemove: handleRemoveComment,
    onSelect: handleSelectComment,
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

  const commentCount = comments.filter(
    (c) => c.viewer === ViewerNames.bim && (!buildingId || buildingId === -1 || c.buildingId === buildingId),
  ).length

  return { addPendingComment, removePendingComment, commentCount }
}
