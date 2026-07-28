// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type * as React from "react"

/** Bridges the framework to the parallel per-entity fields in the Menus store. */
export interface MarkerStoreAdapter {
  currentId: number | null
  focusedId: number | null
  focusRequestId: number
  setCurrentId: (id: number | null) => void
  setFocusedId: (id: number | null) => void
  /** Opens the sidebar editor for this marker (dispatches REQUEST_*_ACTION). */
  requestEdit: (id: number) => void
}

/** One member inside a BIM cluster bubble. */
export interface ClusterMember {
  id: number
  userName?: string
  imageFileId?: number | null
}

/** An item positioned in the BIM scene. Must carry world coords + id. */
export interface BimMarkerItem {
  id: number
  x: number
  y: number
  z: number
  isPending?: boolean
}

/** Everything entity-specific the generic BIM marker hook needs. */
export interface BimMarkerConfig<T extends BimMarkerItem> {
  markerIdKey: "commentId" | "sensorId"
  sphereColor: string
  /** Camera pull-back distance for double-click focus. */
  focusDistance?: number
  /** The CSS2D card component for a single marker. */
  component: React.ComponentType<Record<string, unknown>>
  /** The cluster-bubble component. */
  clusterComponent: React.ComponentType<{
    members: ClusterMember[]
    highlight: boolean
    onSelect: (id: number) => void
    onFocus: (id: number) => void
  }>
  /** Builds the card props for one item (highlight/focused/handlers injected by the hook). */
  propsMapper: (
    item: T,
    ctx: { highlight: boolean; focused: boolean; isAuthor: boolean;
      onSelect: () => void; onFocus: () => void; onEdit?: () => void; onRemove?: () => void },
  ) => Record<string, unknown>
  /** Maps an item to its cluster-member representation. */
  clusterMemberMapper: (item: T) => ClusterMember
  /** Per-item string folded into the re-render signature (e.g. text/name + pending flag). */
  dataHashPart: (item: T) => string
  /** True if the current user may edit/delete this item (author check). */
  isAuthor: (item: T) => boolean
  /** Delete handler (comment cascade vs sensor single-delete differ). */
  onRemove: (id: number) => void
  /** Builds a placeholder item for a pending (being-created) marker. */
  makePendingItem: (id: number, pos: { x: number; y: number; z: number }) => T
}
