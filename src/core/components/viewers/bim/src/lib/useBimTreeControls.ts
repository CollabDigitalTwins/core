'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import {
  clearHover,
  getHiddenItems,
  hoverItems,
  isolateItems,
  onVisibilityChanged,
  selectItems,
  setItemsVisible,
  showAllItems,
} from './bimItemActions'
import {
  allNodeIds,
  collectItems,
  filterTree,
  nodeVisibility,
  subtreeItems,
  type BimTreeNode,
  type ModelIdMap,
  type NodeVisibility,
} from './bimTree'

import type * as OBC from '@thatopen/components'

interface Options {
  components: OBC.Components | null
  nodes: BimTreeNode[]
  searchQuery: string
}

export interface BimTreeControls {
  /** The tree after search filtering. */
  nodes: BimTreeNode[]
  expandedIds: Set<string>
  /** True when every node is expanded, which drives the header toggle. */
  isFullyExpanded: boolean
  toggleExpanded: (id: string) => void
  toggleExpandAll: () => void
  visibilityOf: (node: BimTreeNode) => NodeVisibility
  onNodeClick: (node: BimTreeNode) => void
  onNodeHover: (node: BimTreeNode, isHovering: boolean) => void
  onNodeVisibilityChange: (node: BimTreeNode, visible: boolean) => void
  onNodeIsolate: (node: BimTreeNode) => void
  showAll: () => void
}

/**
 * The shared behaviour behind both sidebar trees: expansion, search-driven
 * auto-expansion, and the select / hide / isolate actions.
 *
 * Visibility is *derived from the scene* (`getHiddenItems`) rather than mirrored
 * in local state. An earlier version tracked what it had applied in a ref, which
 * went stale as soon as anything else changed visibility — floorplan mode, for
 * one — after which toggles silently did nothing.
 */
export function useBimTreeControls({
  components,
  nodes,
  searchQuery,
}: Options): BimTreeControls {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set())
  const [hidden, setHidden] = React.useState<ModelIdMap>({})

  const { nodes: filteredNodes, expandIds } = React.useMemo(
    () => filterTree(nodes, searchQuery),
    [nodes, searchQuery],
  )

  const refreshHidden = React.useCallback(() => {
    if (!components) return
    void getHiddenItems(components).then(setHidden)
  }, [components])

  // Re-read visibility whenever the tree itself changes: a model finishing its
  // load, or being removed, can change what is hidden.
  React.useEffect(() => { refreshHidden() }, [refreshHidden, nodes])

  // ...and whenever anything else changes it — the other tree, the selection
  // toolbar, or the default-hidden classes applied when a model loads.
  React.useEffect(() => {
    if (!components) return
    return onVisibilityChanged(components, refreshHidden)
  }, [components, refreshHidden])

  // Open the ancestors of every search hit. Merging rather than replacing keeps
  // whatever the user had already opened.
  React.useEffect(() => {
    if (expandIds.size === 0) return
    setExpandedIds((current) => {
      let changed = false
      const next = new Set(current)
      for (const id of expandIds) {
        if (!next.has(id)) { next.add(id); changed = true }
      }
      return changed ? next : current
    })
  }, [expandIds])

  const allIds = React.useMemo(() => allNodeIds(filteredNodes), [filteredNodes])
  const isFullyExpanded = allIds.length > 0 && allIds.every(id => expandedIds.has(id))

  const toggleExpanded = React.useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleExpandAll = React.useCallback(() => {
    setExpandedIds(current => (
      allIds.length > 0 && allIds.every(id => current.has(id))
        ? new Set()
        : new Set(allIds)
    ))
  }, [allIds])

  const visibilityOf = React.useCallback(
    (node: BimTreeNode) => nodeVisibility(node, hidden),
    [hidden],
  )

  const onNodeClick = React.useCallback((node: BimTreeNode) => {
    if (!components) return
    void selectItems(components, subtreeItems(node))
  }, [components])

  const onNodeHover = React.useCallback((node: BimTreeNode, isHovering: boolean) => {
    if (!components) return
    if (!isHovering) {
      clearHover(components)
      return
    }
    // Only the node's own element, not its whole branch — hovering a storey
    // should not build overlay geometry for everything inside it.
    void hoverItems(components, node.items)
  }, [components])

  const onNodeVisibilityChange = React.useCallback(
    (node: BimTreeNode, visible: boolean) => {
      if (!components) return
      void setItemsVisible(components, subtreeItems(node), visible).then(refreshHidden)
    },
    [components, refreshHidden],
  )

  const onNodeIsolate = React.useCallback((node: BimTreeNode) => {
    if (!components) return
    void isolateItems(components, subtreeItems(node)).then(refreshHidden)
  }, [components, refreshHidden])

  const showAll = React.useCallback(() => {
    if (!components) return
    void showAllItems(components).then(refreshHidden)
  }, [components, refreshHidden])

  // Stable while nothing about the tree changes, so the memoised rows survive
  // re-renders of the surrounding panel (splitter drags, sibling search input).
  return React.useMemo(() => ({
    nodes: filteredNodes,
    expandedIds,
    isFullyExpanded,
    toggleExpanded,
    toggleExpandAll,
    visibilityOf,
    onNodeClick,
    onNodeHover,
    onNodeVisibilityChange,
    onNodeIsolate,
    showAll,
  }), [
    filteredNodes,
    expandedIds,
    isFullyExpanded,
    toggleExpanded,
    toggleExpandAll,
    visibilityOf,
    onNodeClick,
    onNodeHover,
    onNodeVisibilityChange,
    onNodeIsolate,
    showAll,
  ])
}

/** Total number of elements a tree covers, for the section's count badge. */
export function useTreeItemCount(nodes: BimTreeNode[]): number {
  return React.useMemo(() => {
    const items = collectItems(nodes)
    let total = 0
    for (const modelId of Object.keys(items)) total += items[modelId].size
    return total
  }, [nodes])
}
