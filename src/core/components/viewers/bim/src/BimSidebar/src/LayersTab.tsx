'use client'
import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Input, Button, IfcIcon } from '../../../../../ui/'
import * as LR from 'lucide-react'
import type { SpatialTreeItem } from '../../SpatialStructure'
import { SpatialStructure } from '../../SpatialStructure'
import { Highlighter } from '../../Highlighter'
import { BimContext } from '../../../../../../store'


interface LayersTabProps {
  modelId: string | null
}

export function LayersTab({ modelId }: LayersTabProps) {
  const t = useTranslations('LayersTab')
  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents } = bimState.bim

  const [spatialStructureTree, setSpatialStructureTree] = React.useState<SpatialTreeItem | null>(null)
  const [loadingSpatialStructure, setLoadingSpatialStructure] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set())
  const [isTreeExpanded, setIsTreeExpanded] = React.useState(true)

  const highlighterRef = React.useRef<Highlighter | null>(null)
  const spatialStructureRef = React.useRef<SpatialStructure | null>(null)

  const getItemId = React.useCallback((item: SpatialTreeItem, path = ''): string => {
    const currentPath = path ? `${path}/${item.name}` : item.name
    return item.localId ? `${item.localId}` : currentPath
  }, [])

  React.useEffect(() => {
    if (bimComponents) {
      try {
        spatialStructureRef.current = bimComponents.get(SpatialStructure)
      } catch {
        spatialStructureRef.current = new SpatialStructure(bimComponents)
      }

      const spatialStructure = spatialStructureRef.current

      // Set initial state from current spatial structure
      setSpatialStructureTree(spatialStructure.tree)
      setLoadingSpatialStructure(spatialStructure.isLoading)

      // Subscribe to spatial structure created event
      const handleSpatialStructureCreated = (data: { tree: SpatialTreeItem | null }) => {
        setSpatialStructureTree(data.tree)
      }

      // Subscribe to loading state change event
      const handleLoadingStateChanged = (data: { isLoading: boolean }) => {
        setLoadingSpatialStructure(data.isLoading)
      }

      spatialStructure.onSpatialStructureCreated.add(handleSpatialStructureCreated)
      spatialStructure.onLoadingStateChanged.add(handleLoadingStateChanged)

      // If we have a modelId and no current tree, fetch the spatial structure
      if (modelId && !spatialStructure.tree && !spatialStructure.isLoading) {
        spatialStructure.getSpatialStructure(modelId)
      }

      // Cleanup event listeners
      return () => {
        spatialStructure.onSpatialStructureCreated.remove(handleSpatialStructureCreated)
        spatialStructure.onLoadingStateChanged.remove(handleLoadingStateChanged)
      }
    }
  }, [bimComponents, modelId])

  React.useEffect(() => {
    if (bimComponents) {
      if (!highlighterRef.current) {
        try {
          highlighterRef.current = bimComponents.get(Highlighter)
        } catch {
          highlighterRef.current = new Highlighter(bimComponents)
        }
      }

    }
  }, [bimComponents])

  React.useEffect(() => {
    if (!spatialStructureTree || !searchQuery.trim()) return
    const newExpanded = new Set(expandedItems)
    const expandParentsOfMatches = (items: SpatialTreeItem[], parentPath = '', parentId?: string): void => {
      for (const item of items) {
        const itemId = getItemId(item, parentPath)
        const matches = item.name.toLowerCase().includes(searchQuery.toLowerCase())
        if (matches && parentId) {
          newExpanded.add(parentId)
        }
        if (item.children.length > 0) {
          expandParentsOfMatches(item.children, `${parentPath}/${item.name}`, itemId)
        }
      }
    }
    expandParentsOfMatches(spatialStructureTree.children)
    setExpandedItems(newExpanded)
  }, [searchQuery, spatialStructureTree, expandedItems, getItemId])

  const handleTreeNodeClick = React.useCallback(async (item: SpatialTreeItem, event: React.MouseEvent) => {
    if (!highlighterRef.current) return
    const localIds = item.localId === undefined ? [] : [item.localId]
    if (localIds.length > 0) {
      const isCtrlPressed = event.ctrlKey
      await highlighterRef.current.highlightSelection(localIds, modelId, isCtrlPressed)
    }
    if (item.localId && highlighterRef.current) {
      highlighterRef.current.onElementsSelected.trigger([item.localId])
    }
  }, [modelId])

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const toggleTreeExpansion = React.useCallback(() => {
    if (!spatialStructureTree) return
    const newIsExpanded = !isTreeExpanded
    setIsTreeExpanded(newIsExpanded)
    if (newIsExpanded) {
      const expandAll = (item: SpatialTreeItem, expanded: Set<string>, path = '') => {
        const itemId = getItemId(item, path)
        expanded.add(itemId)
        for (const child of item.children) {
          expandAll(child, expanded, `${path}/${item.name}`)
        }
      }
      const newExpanded = new Set<string>()
      for (const child of spatialStructureTree.children) {
        expandAll(child, newExpanded)
      }
      setExpandedItems(newExpanded)
    } else {
      setExpandedItems(new Set())
    }
  }, [isTreeExpanded, spatialStructureTree, getItemId])

  interface SpatialTreeNodeProps {
    item: SpatialTreeItem
    expandedItems: Set<string>
    onToggleExpanded: (id: string) => void
    onNodeClick: (item: SpatialTreeItem, event: React.MouseEvent) => void
    searchQuery: string
    path?: string
  }

  const SpatialTreeNode: React.FC<SpatialTreeNodeProps> = ({
    item,
    expandedItems,
    onToggleExpanded,
    onNodeClick,
    searchQuery,
    path = '',
  }) => {
    const itemId = getItemId(item, path)
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.has(itemId)
    const itemMatchesSearch = searchQuery === '' || item.name.toLowerCase().includes(searchQuery.toLowerCase())

    const visibleChildren = React.useMemo(() => {
      if (!hasChildren) return []
      if (searchQuery === '') return item.children
      return item.children.filter(child =>
        child.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hasMatchingDescendants(child, searchQuery)
      )
    }, [hasChildren, item.children, searchQuery])

    const shouldShow = itemMatchesSearch || visibleChildren.length > 0
    if (!shouldShow) return null
    return (
      <div>
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={e => onNodeClick(item, e)}
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
          <span className="text-sm text-foreground flex-1">{item.name}</span>
        </div>

        {isExpanded && visibleChildren.length > 0 && (
          <div className="ml-4 space-y-1">
            {visibleChildren.map(child => {
              const childPath = `${path}/${item.name}`
              const childId = getItemId(child, childPath)
              return (
                <SpatialTreeNode
                  key={childId}
                  item={child}
                  expandedItems={expandedItems}
                  onToggleExpanded={onToggleExpanded}
                  onNodeClick={onNodeClick}
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

  function hasMatchingDescendants(item: SpatialTreeItem, searchQuery: string): boolean {
    if (searchQuery === '') return false
    return item.children.some(child =>
      child.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hasMatchingDescendants(child, searchQuery)
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className='flex flex-row items-center gap-2 pt-1'>
          <IfcIcon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">{t('spatialStructure')}</h3>
          </div>
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
        </div>

        {/* Search Bar */}
        <div className="relative">
          <LR.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Tree Structure */}
      <div className="flex-1 overflow-auto px-4 py-2">
        {loadingSpatialStructure ? (
          <div className="flex items-center justify-center py-8">
            <LR.Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">{t('loadingText')}</span>
          </div>
        ) : spatialStructureTree ? (
          <div className="space-y-1">
            {spatialStructureTree.children.length > 0 && (
              <div className="space-y-1">
                {spatialStructureTree.children.map(item => {
                  const itemId = getItemId(item)
                  return (
                    <SpatialTreeNode
                      key={itemId}
                      item={item}
                      expandedItems={expandedItems}
                      onToggleExpanded={toggleExpanded}
                      onNodeClick={handleTreeNodeClick}
                      searchQuery={searchQuery}
                      path=""
                    />
                  )
                })}
              </div>
            )}

            {searchQuery.trim() && (() => {
              const hasResults = spatialStructureTree.children.some(child =>
                child.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                hasMatchingDescendants(child, searchQuery)
              )
              return !hasResults ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm text-muted-foreground">
                    {t('noResults')} &ldquo;{searchQuery}&rdquo;
                  </span>
                </div>
              ) : null
            })()}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <span className="text-sm text-muted-foreground">{t('noneAvailable')}</span>
          </div>
        )}
      </div>
    </div>
  )
}
