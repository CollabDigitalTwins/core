'use client'

import * as React from 'react'
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import { Button } from '../../../../../../../ui/Button'
import { Switch } from '../../../../../../../ui/Switch'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { cn } from '../../../../../../../../utils/utils'
import { BimContext } from '../../../../../../../../store'
import {
  SpatialStructure,
  type SpatialTreeItem,
} from '../../../../SpatialStructure'

interface Props {
  /** Filter query coming from the shared search bar at the top of the
   *  LayersTab — applied to both the tree itself and to auto-expanding
   *  any branch that contains a match. */
  searchQuery: string
  /** Currently active fragment model id. When omitted, the section
   *  resolves the first model in `FragmentsManager.list`. */
  modelId: string | null
}

/**
 * Sidebar section that renders the IFC spatial-structure tree (Project →
 * Site → Building → Storey → …) and lets the user select / hover items
 * to highlight them in the 3D view.
 *
 * Extracted from `LayersTab/index.tsx` so that file can stay focused on
 * the shared chrome (search bar + the three sibling sections).
 */
export function SpatialStructureSection({ searchQuery, modelId }: Props) {
  const t = useTranslations('LayersTab')
  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents } = bimState.bim

  const [tree, setTree] = React.useState<SpatialTreeItem | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(
    new Set(),
  )
  const [visibilityByNodeId, setVisibilityByNodeId] = React.useState<Record<string, boolean>>({})
  const [isTreeExpanded, setIsTreeExpanded] = React.useState(true)

  const highlighterRef = React.useRef<OBF.Highlighter | null>(null)
  const spatialStructureRef = React.useRef<SpatialStructure | null>(null)
  const currentModelIdRef = React.useRef<string | null>(null)
  const activeModelIdRef = React.useRef<string | null>(null)
  const appliedVisibilityByLocalIdRef = React.useRef<Map<string, boolean>>(new Map())

  const getItemId = React.useCallback(
    (item: SpatialTreeItem, path = ''): string => {
      const currentPath = path ? `${path}/${item.name}` : item.name
      return item.localId ? `${item.localId}` : currentPath
    },
    [],
  )

  React.useEffect(() => {
    if (!bimComponents) return

    try {
      spatialStructureRef.current = bimComponents.get(SpatialStructure)
    } catch {
      spatialStructureRef.current = new SpatialStructure(bimComponents)
    }

    const spatialStructure = spatialStructureRef.current

    setTree(spatialStructure.tree)
    setIsLoading(spatialStructure.isLoading)

    const handleTreeCreated = (data: { tree: SpatialTreeItem | null }) => {
      setTree(data.tree)
    }
    const handleLoadingChanged = (data: { isLoading: boolean }) => {
      setIsLoading(data.isLoading)
    }

    spatialStructure.onSpatialStructureCreated.add(handleTreeCreated)
    spatialStructure.onLoadingStateChanged.add(handleLoadingChanged)

    try {
      highlighterRef.current = bimComponents.get(OBF.Highlighter)
    } catch {
      // Highlighter not registered in this viewer — selection/hover
      // becomes a visual no-op which is fine.
    }

    try {
      const fragments = bimComponents.get(OBC.FragmentsManager)
      if (fragments && 'list' in fragments) {
        const fragmentsList = fragments.list as Map<string, any>
        if (modelId) {
          currentModelIdRef.current = modelId
        } else if (fragmentsList.size > 0) {
          currentModelIdRef.current = Array.from(fragmentsList.keys())[0]
        }
      }
    } catch {
      // FragmentsManager not initialized yet — leave currentModelIdRef
      // null; the tree call below will short-circuit.
    }

    if (activeModelIdRef.current !== currentModelIdRef.current) {
      activeModelIdRef.current = currentModelIdRef.current
      appliedVisibilityByLocalIdRef.current = new Map()
      setVisibilityByNodeId({})
    }

    if (
      currentModelIdRef.current &&
      !spatialStructure.tree &&
      !spatialStructure.isLoading
    ) {
      spatialStructure.getSpatialStructure(currentModelIdRef.current)
    }

    return () => {
      spatialStructure.onSpatialStructureCreated.remove(handleTreeCreated)
      spatialStructure.onLoadingStateChanged.remove(handleLoadingChanged)
    }
  }, [bimComponents, modelId])

  React.useEffect(() => {
    if (!tree || !bimComponents || !currentModelIdRef.current) return

    const fragments = bimComponents.get(OBC.FragmentsManager)
    const model = fragments.core.models.list.get(currentModelIdRef.current) as any
    if (!model?.setVisible) return

    const hideIds: number[] = []
    const showIds: number[] = []

    const visit = (item: SpatialTreeItem, parentPath = '', parentVisible = true): void => {
      const itemId = getItemId(item, parentPath)
      const effectiveVisible = parentVisible && (visibilityByNodeId[itemId] ?? true)

      if (item.localId !== undefined) {
        const appliedKey = `${currentModelIdRef.current}:${item.localId}`
        const lastAppliedVisible = appliedVisibilityByLocalIdRef.current.get(appliedKey)
        if (lastAppliedVisible !== effectiveVisible) {
          appliedVisibilityByLocalIdRef.current.set(appliedKey, effectiveVisible)
          if (effectiveVisible) {
            showIds.push(item.localId)
          } else {
            hideIds.push(item.localId)
          }
        }
      }

      for (const child of item.children) {
        visit(child, `${parentPath}/${item.name}`, effectiveVisible)
      }
    }

    for (const child of tree.children) {
      visit(child)
    }

    if (hideIds.length === 0 && showIds.length === 0) return

    void (async () => {
      try {
        if (hideIds.length > 0) {
          await model.setVisible(hideIds, false)
        }
        if (showIds.length > 0) {
          await model.setVisible(showIds, true)
        }
        fragments.core.update(true)
      } catch (error) {
        console.warn('Failed to sync spatial visibility:', error)
      }
    })()
  }, [bimComponents, tree, getItemId, visibilityByNodeId])

  // Auto-expand parents of search matches so hits are visible without the
  // user having to drill down manually.
  React.useEffect(() => {
    if (!tree || !searchQuery.trim()) return
    const next = new Set(expandedItems)
    const expandParents = (
      items: SpatialTreeItem[],
      parentPath = '',
      parentId?: string,
    ): void => {
      for (const item of items) {
        const itemId = getItemId(item, parentPath)
        const matches = item.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
        if (matches && parentId) next.add(parentId)
        if (item.children.length > 0) {
          expandParents(item.children, `${parentPath}/${item.name}`, itemId)
        }
      }
    }
    expandParents(tree.children)
    setExpandedItems(next)
    // Intentionally no `expandedItems` in deps — that would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, tree, getItemId])

  const handleNodeClick = React.useCallback((item: SpatialTreeItem) => {
    if (
      !highlighterRef.current ||
      !currentModelIdRef.current ||
      item.localId === undefined
    ) {
      return
    }
    try {
      highlighterRef.current.clear('select')
      const selection = {
        [currentModelIdRef.current]: new Set([item.localId]),
      }
      highlighterRef.current.highlightByID('select', selection)
    } catch (error) {
      console.warn('Highlighting failed:', error)
    }
  }, [])

  const handleNodeHover = React.useCallback(
    (item: SpatialTreeItem, isHovering: boolean) => {
      if (
        !highlighterRef.current ||
        !currentModelIdRef.current ||
        item.localId === undefined
      ) {
        return
      }
      try {
        if (isHovering) {
          const selection = {
            [currentModelIdRef.current]: new Set([item.localId]),
          }
          highlighterRef.current.highlightByID('hover', selection)
        } else {
          highlighterRef.current.clear('hover')
        }
      } catch (error) {
        console.warn('Hover highlighting failed:', error)
      }
    },
    [],
  )

  const syncVisibilityToModel = React.useCallback(async (
    nextVisibilityByNodeId: Record<string, boolean>,
  ) => {
    if (!bimComponents || !currentModelIdRef.current) return

    const fragments = bimComponents.get(OBC.FragmentsManager)
    const model = fragments.core.models.list.get(currentModelIdRef.current) as any
    if (!model?.setVisible) return

    const hideIds: number[] = []
    const showIds: number[] = []

    const visit = (node: SpatialTreeItem, parentPath = '', parentVisible = true): void => {
      const itemId = getItemId(node, parentPath)
      const nodeVisible = nextVisibilityByNodeId[itemId] ?? true
      const effectiveVisible = parentVisible && nodeVisible

      if (node.localId !== undefined) {
        const appliedKey = `${currentModelIdRef.current}:${node.localId}`
        const lastAppliedVisible = appliedVisibilityByLocalIdRef.current.get(appliedKey)
        if (lastAppliedVisible !== effectiveVisible) {
          appliedVisibilityByLocalIdRef.current.set(appliedKey, effectiveVisible)
          if (effectiveVisible) {
            showIds.push(node.localId)
          } else {
            hideIds.push(node.localId)
          }
        }
      }

      for (const child of node.children) {
        visit(child, `${parentPath}/${node.name}`, effectiveVisible)
      }
    }

    for (const child of tree?.children ?? []) {
      visit(child)
    }

    if (hideIds.length === 0 && showIds.length === 0) return

    try {
      if (hideIds.length > 0) {
        await model.setVisible(hideIds, false)
      }
      if (showIds.length > 0) {
        await model.setVisible(showIds, true)
      }
      fragments.core.update(true)
    } catch (error) {
      console.warn('Failed to sync spatial visibility:', error)
    }
  }, [bimComponents, getItemId, tree])

  const applyNodeVisibility = React.useCallback(async (
    item: SpatialTreeItem,
    visible: boolean,
  ) => {
    const nextVisibility: Record<string, boolean> = { ...visibilityByNodeId }

    const setNodeAndChildren = (node: SpatialTreeItem, parentPath = ''): void => {
      const itemId = getItemId(node, parentPath)
      nextVisibility[itemId] = visible
      for (const child of node.children) {
        setNodeAndChildren(child, `${parentPath}/${node.name}`)
      }
    }

    setNodeAndChildren(item)

    setVisibilityByNodeId(nextVisibility)
    await syncVisibilityToModel(nextVisibility)
  }, [getItemId, syncVisibilityToModel, visibilityByNodeId])

  const handleNodeVisibilityChange = React.useCallback((item: SpatialTreeItem, nextVisible: boolean) => {
    void applyNodeVisibility(item, nextVisible)
  }, [applyNodeVisibility])

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedItems)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedItems(next)
  }

  const toggleTreeExpansion = React.useCallback(() => {
    if (!tree) return
    const newIsExpanded = !isTreeExpanded
    setIsTreeExpanded(newIsExpanded)
    if (newIsExpanded) {
      const expandAll = (
        item: SpatialTreeItem,
        expanded: Set<string>,
        path = '',
      ) => {
        const itemId = getItemId(item, path)
        expanded.add(itemId)
        for (const child of item.children) {
          expandAll(child, expanded, `${path}/${item.name}`)
        }
      }
      const next = new Set<string>()
      for (const child of tree.children) expandAll(child, next)
      setExpandedItems(next)
    } else {
      setExpandedItems(new Set())
    }
  }, [isTreeExpanded, tree, getItemId])

  const treeBody = isLoading ? (
    <div className="flex items-center justify-center py-8">
      <LR.Loader2 className="h-4 w-4 animate-spin mr-2" />
      <span className="text-sm text-muted-foreground">{t('loadingText')}</span>
    </div>
  ) : tree ? (
    <div className="space-y-1">
      {tree.children.length > 0 && (
        <div className="space-y-1">
          {tree.children.map((item) => {
            const itemId = getItemId(item)
            return (
              <SpatialTreeNode
                key={itemId}
                item={item}
                getItemId={getItemId}
                expandedItems={expandedItems}
                onToggleExpanded={toggleExpanded}
                onNodeClick={handleNodeClick}
                onNodeHover={handleNodeHover}
                onNodeVisibilityChange={handleNodeVisibilityChange}
                visibilityByNodeId={visibilityByNodeId}
                searchQuery={searchQuery}
                path=""
              />
            )
          })}
        </div>
      )}
      {searchQuery.trim() &&
        !tree.children.some(
          (child) =>
            child.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            hasMatchingDescendants(child, searchQuery),
        ) && (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-muted-foreground">
              {t('noResults')} &ldquo;{searchQuery}&rdquo;
            </span>
          </div>
        )}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center py-8 space-y-3">
      <span className="text-sm text-muted-foreground">{t('noneAvailable')}</span>
    </div>
  )

  return (
    <CollapsibleSection
      title={t('spatialStructure')}
      className="overflow-y-auto pr-2"
      style={{ height: '100%', minHeight: 0 }}
      headerActions={
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0"
          onClick={toggleTreeExpansion}
          title={isTreeExpanded ? t('collapseTitle') : t('expandTitle')}
        >
          {isTreeExpanded ? (
            <LR.ListCollapse className="h-4 w-4" />
          ) : (
            <LR.ListFilterPlus className="h-4 w-4" />
          )}
        </Button>
      }
    >
      {treeBody}
    </CollapsibleSection>
  )
}

interface SpatialTreeNodeProps {
  item: SpatialTreeItem
  getItemId: (item: SpatialTreeItem, path?: string) => string
  expandedItems: Set<string>
  onToggleExpanded: (id: string) => void
  onNodeClick: (item: SpatialTreeItem) => void
  onNodeHover: (item: SpatialTreeItem, isHovering: boolean) => void
  onNodeVisibilityChange: (item: SpatialTreeItem, visible: boolean) => void
  visibilityByNodeId: Record<string, boolean>
  searchQuery: string
  path?: string
}

function SpatialTreeNode({
  item,
  getItemId,
  expandedItems,
  onToggleExpanded,
  onNodeClick,
  onNodeHover,
  onNodeVisibilityChange,
  visibilityByNodeId,
  searchQuery,
  path = '',
}: SpatialTreeNodeProps) {
  const itemId = getItemId(item, path)
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedItems.has(itemId)
  const isVisible = visibilityByNodeId[itemId] ?? true
  const itemMatchesSearch =
    searchQuery === '' ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase())

  const visibleChildren = React.useMemo(() => {
    if (!hasChildren) return []
    if (searchQuery === '') return item.children
    return item.children.filter(
      (child) =>
        child.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hasMatchingDescendants(child, searchQuery),
    )
  }, [hasChildren, item.children, searchQuery])

  const shouldShow = itemMatchesSearch || visibleChildren.length > 0
  if (!shouldShow) return null

  return (
    <div>
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
        onClick={() => onNodeClick(item)}
        onMouseEnter={() => onNodeHover(item, true)}
        onMouseLeave={() => onNodeHover(item, false)}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0"
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) onToggleExpanded(itemId)
          }}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <LR.ChevronDown className="h-4 w-4" />
            ) : (
              <LR.ChevronRight className="h-4 w-4" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </Button>
        <span className={cn("text-sm flex-1", isVisible ? "text-foreground" : "text-muted-foreground line-through")}>{item.name}</span>
        <div
          className="flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <Switch
            checked={isVisible}
            onCheckedChange={(checked) => onNodeVisibilityChange(item, checked)}
            aria-label={`Toggle visibility for ${item.name}`}
          />
        </div>
      </div>

      {isExpanded && visibleChildren.length > 0 && (
        <div className="ml-4 space-y-1">
          {visibleChildren.map((child) => {
            const childPath = `${path}/${item.name}`
            const childId = getItemId(child, childPath)
            return (
              <SpatialTreeNode
                key={childId}
                item={child}
                getItemId={getItemId}
                expandedItems={expandedItems}
                onToggleExpanded={onToggleExpanded}
                onNodeClick={onNodeClick}
                onNodeHover={onNodeHover}
                onNodeVisibilityChange={onNodeVisibilityChange}
                visibilityByNodeId={visibilityByNodeId}
                searchQuery={searchQuery}
                path={childPath}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function hasMatchingDescendants(
  item: SpatialTreeItem,
  searchQuery: string,
): boolean {
  if (searchQuery === '') return false
  return item.children.some(
    (child) =>
      child.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hasMatchingDescendants(child, searchQuery),
  )
}
