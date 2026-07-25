"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js"

import { HooksCtx, type HooksBag } from "../../../../hooks/provider"
import { clusterMarkersByScreenSpace } from "../../bim/src/tools/AddToBim/src/clusterMarkersByScreenSpace"
import { renderCSS2DMarkers, type MarkerRef } from "../../bim/src/tools/AddToBim/src/renderCSS2DMarkers"

import { computeMarkerLookAt } from "./computeMarkerLookAt"
import type { BimMarkerConfig, BimMarkerItem, MarkerStoreAdapter } from "./types"

type ClusterMarkerRef = { root: ReturnType<typeof createRoot>; css2dObject: CSS2DObject }

interface RenderState<T extends BimMarkerItem> {
  world: any
  /** Non-pending items eligible for clustering. */
  items: T[]
  /** Pending (being-created) markers — always rendered as singles. */
  pending: T[]
  isVisible: boolean
  currentId: number | null
  focusedId: number | null
  coreHooks: HooksBag | null
  config: BimMarkerConfig<T>
  onRemove: (id: number) => void
  onSelect: (id: number) => void
  onFocus: (id: number) => void
  onEdit: (id: number) => void
}

/**
 * Builds the per-item props for the card component, delegating entity-specific shaping to
 * `config.propsMapper`. Pending (being-created) items get a reduced context: `isAuthor:false`
 * and no author-gated (edit/remove) handlers.
 */
function makePropsMapper<T extends BimMarkerItem>(state: RenderState<T>) {
  const { config, currentId, focusedId, onSelect, onFocus, onEdit, onRemove } = state
  return (item: T): Record<string, unknown> => {
    const highlight = currentId === item.id
    const focused = focusedId === item.id
    if (item.isPending) {
      return config.propsMapper(item, {
        highlight,
        focused,
        isAuthor: false,
        onSelect: () => onSelect(item.id),
        onFocus: () => onFocus(item.id),
      })
    }
    return config.propsMapper(item, {
      highlight,
      focused,
      isAuthor: config.isAuthor(item),
      onSelect: () => onSelect(item.id),
      onFocus: () => onFocus(item.id),
      onEdit: () => onEdit(item.id),
      onRemove: () => onRemove(item.id),
    })
  }
}

function clearSingles<T extends BimMarkerItem>(
  world: any,
  registry: React.MutableRefObject<Map<string, MarkerRef>>,
  config: BimMarkerConfig<T>,
) {
  renderCSS2DMarkers(world, {
    items: [],
    markerIdKey: config.markerIdKey,
    registry,
    component: config.component,
    propsMapper: () => ({}),
    sphereColor: config.sphereColor,
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
function renderMarkers<T extends BimMarkerItem>(
  state: RenderState<T>,
  singleRegistry: React.MutableRefObject<Map<string, MarkerRef>>,
  clusterRegistry: React.MutableRefObject<Map<string, ClusterMarkerRef>>,
  lastSignatureRef: React.MutableRefObject<string>,
) {
  const { world, items, pending, isVisible, currentId, focusedId, coreHooks, config, onRemove, onSelect, onFocus } = state
  if (!world) return

  if (!isVisible) {
    if (lastSignatureRef.current === "hidden") return
    clearSingles(world, singleRegistry, config)
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
  const dataHash = [...items, ...pending].map((c) => config.dataHashPart(c)).join(";")
  const signature =
    `v2|${currentId}|${focusedId}|C:${clusterKeys.join(",")}` +
    `|S:${singleItems.map((s) => s.id).join(",")}|D:${dataHash}`
  if (signature === lastSignatureRef.current) return
  lastSignatureRef.current = signature

  // Singles (including pending) via the shared per-marker renderer
  renderCSS2DMarkers(world, {
    items: singleItems,
    markerIdKey: config.markerIdKey,
    registry: singleRegistry,
    component: config.component,
    hooksContextValue: coreHooks,
    propsMapper: makePropsMapper(state),
    sphereColor: config.sphereColor,
    isVisible: true,
    onRemove,
  })

  // Float the highlighted/focused marker above overlapping ones. The CSS2D renderer sorts by
  // renderOrder first (then camera distance), so this makes a selected marker that sits behind
  // nearer markers come to the front — visible and clickable instead of buried.
  singleRegistry.current.forEach((ref, id) => {
    const nid = Number(id)
    ref.css2dObject.renderOrder = nid === currentId || nid === focusedId ? 1 : 0
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
    const members = cluster.members.map((m) => config.clusterMemberMapper(m))
    const highlight = currentId != null && members.some((m) => m.id === currentId)
    const element = React.createElement(config.clusterComponent, { members, highlight, onSelect, onFocus })
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

/**
 * Generic BIM marker layer. Renders `items` as clustered CSS2D markers over a `three` world,
 * driving selection/focus/edit/remove through a `MarkerStoreAdapter` and shaping every
 * entity-specific detail through `config`. Behaviour is a straight generalization of the
 * comment marker layer (screen-space clustering, rAF diffing, double-click focus).
 */
export function useMarkerLayerBim<T extends BimMarkerItem>(
  world: any,
  items: T[],
  opts: {
    isVisible: boolean
    store: MarkerStoreAdapter
    coreHooks: HooksBag | null
    config: BimMarkerConfig<T>
  },
): { addPending: (pos: { x: number; y: number; z: number }) => number; removePending: (id: number) => void } {
  const { isVisible, store, coreHooks, config } = opts

  const singleRegistry = React.useRef<Map<string, MarkerRef>>(new Map())
  const clusterRegistry = React.useRef<Map<string, ClusterMarkerRef>>(new Map())
  const lastSignatureRef = React.useRef<string>("")
  const stateRef = React.useRef<RenderState<T> | null>(null)
  const itemsRef = React.useRef<T[]>([])

  itemsRef.current = items

  const handleSelect = React.useCallback((id: number) => {
    store.setCurrentId(id)
  }, [store])

  const handleFocus = React.useCallback((id: number) => {
    store.setCurrentId(id)
    store.setFocusedId(id)
  }, [store])

  const handleEdit = React.useCallback((id: number) => {
    store.requestEdit(id)
  }, [store])

  // Pending markers for loading indicators while an item is being created
  const [pending, setPending] = React.useState<Array<{ id: number; x: number; y: number; z: number }>>([])

  const addPending = React.useCallback((position: { x: number; y: number; z: number }) => {
    const id = -Date.now()
    setPending((prev) => [...prev, { id, ...position }])
    return id
  }, [])

  const removePending = React.useCallback((id: number) => {
    setPending((prev) => prev.filter((p) => p.id !== id))
  }, [])

  // Keep the latest inputs available to the rAF render loop (avoids stale closures)
  stateRef.current = {
    world,
    // Non-pending items carry an explicit isPending:false (parity with the pending placeholders).
    // Cast: spreading a generic T and assigning back to T[] is not provably safe to tsc.
    items: items.map((it) => ({ ...it, isPending: false })) as T[],
    pending: pending.map((p) => config.makePendingItem(p.id, { x: p.x, y: p.y, z: p.z })),
    isVisible,
    currentId: store.currentId,
    focusedId: store.focusedId,
    coreHooks,
    config,
    onRemove: config.onRemove,
    onSelect: handleSelect,
    onFocus: handleFocus,
    onEdit: handleEdit,
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
      clearSingles(world, singleRegistry, config)
      lastSignatureRef.current = ""
    }
  }, [world])

  // Zoom to a marker when it is focused (double-clicked here or in the sidebar).
  React.useEffect(() => {
    if (store.focusedId == null || !world) return
    const target = itemsRef.current.find((it) => it.id === store.focusedId)
    if (!target || target.x == null || target.y == null || target.z == null) return
    const controls = world.camera?.controls
    if (!controls) return

    const camPos = controls.getPosition(new THREE.Vector3())
    const camTarget = controls.getTarget(new THREE.Vector3())
    const lookAt = computeMarkerLookAt(
      { x: camPos.x, y: camPos.y, z: camPos.z },
      { x: camTarget.x, y: camTarget.y, z: camTarget.z },
      { x: target.x, y: target.y, z: target.z },
      config.focusDistance ?? 8,
    )
    void controls.setLookAt(lookAt.camX, lookAt.camY, lookAt.camZ, lookAt.tarX, lookAt.tarY, lookAt.tarZ, true)
  }, [store.focusRequestId, world])

  return { addPending, removePending }
}
