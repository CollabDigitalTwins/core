'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { cn } from '../../../../../../../../utils/utils'
import { Button } from '../../../../../../../ui/Button'
import { Switch } from '../../../../../../../ui/Switch'

import type { BimTreeNode } from '../../../../lib/bimTree'
import type { BimTreeControls } from '../../../../lib/useBimTreeControls'

interface Props {
  nodes: BimTreeNode[]
  controls: BimTreeControls
}

/**
 * Renders a `BimTreeNode` tree with select / hide / isolate on every row.
 *
 * Shared by the spatial structure and IFC class sections so both behave the
 * same; all the state lives in `useBimTreeControls`.
 */
export function BimTreeView({ nodes, controls }: Props) {
  return (
    <div className="space-y-1">
      {nodes.map(node => (
        <BimTreeRow key={node.id} node={node} controls={controls} />
      ))}
    </div>
  )
}

interface RowProps {
  node: BimTreeNode
  controls: BimTreeControls
}

/**
 * Memoised against the `controls` object, which `useBimTreeControls` keeps
 * stable while nothing about the tree changes. That matters most while the user
 * drags the Layers tab splitters: those re-render the section on every pointer
 * move, and without this the whole tree re-rendered with them.
 */
const BimTreeRow = React.memo(function BimTreeRow({ node, controls }: RowProps) {
  const t = useTranslations('LayersTab')
  const {
    expandedIds,
    toggleExpanded,
    visibilityOf,
    onNodeClick,
    onNodeHover,
    onNodeVisibilityChange,
    onNodeIsolate,
  } = controls

  const hasChildren = node.children.length > 0
  const isExpanded = expandedIds.has(node.id)
  const visibility = visibilityOf(node)
  const isHidden = visibility === 'hidden'

  // The category is already the label on the IFC class tree, so only show it as
  // a suffix when it adds something (a named element in the spatial tree).
  const categorySuffix =
    node.category && node.category !== node.label ? node.category : null

  return (
    <div>
      <div
        className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
        onClick={() => onNodeClick(node)}
        onMouseEnter={() => onNodeHover(node, true)}
        onMouseLeave={() => onNodeHover(node, false)}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) toggleExpanded(node.id)
          }}
          disabled={!hasChildren}
          aria-label={
            hasChildren
              ? t(isExpanded ? 'collapseNodeLabel' : 'expandNodeLabel', { name: node.label })
              : undefined
          }
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

        <span
          className={cn(
            'text-sm flex-1 truncate',
            isHidden ? 'text-muted-foreground line-through' : 'text-foreground',
          )}
          title={node.label}
        >
          {node.label}
          {categorySuffix && (
            <span className="ml-1.5 text-xs text-muted-foreground">{categorySuffix}</span>
          )}
        </span>

        {node.count !== undefined && (
          <span className="text-xs tabular-nums text-muted-foreground flex-shrink-0">
            {node.count}
          </span>
        )}

        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            onClick={() => onNodeIsolate(node)}
            title={t('isolateTitle')}
            aria-label={t('isolateLabel', { name: node.label })}
          >
            <LR.Focus className="h-4 w-4" />
          </Button>
          <Switch
            checked={visibility !== 'hidden'}
            // A branch with only some of its elements hidden reads as "on" but
            // is flagged for assistive tech, since the switch itself is binary.
            aria-checked={visibility === 'partial' ? 'mixed' : undefined}
            onCheckedChange={checked => onNodeVisibilityChange(node, checked)}
            aria-label={t('toggleVisibilityLabel', { name: node.label })}
          />
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="ml-4 space-y-1">
          {node.children.map(child => (
            <BimTreeRow key={child.id} node={child} controls={controls} />
          ))}
        </div>
      )}
    </div>
  )
})
