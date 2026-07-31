'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { Tabs, TabsList, TabsTrigger } from '../../../../../../../ui/Tabs'

export interface LayerGroupView {
  id: string
  /** Short label for the switcher. */
  label: string
  icon: React.ElementType
  content: React.ReactNode
}

interface Props {
  title: string
  icon?: React.ElementType
  views: LayerGroupView[]
  activeId: string
  onActiveChange: (id: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * One collapsible group in the Layers tab holding several related views, with a
 * segmented switcher to pick between them — the same control the Settings tab
 * uses for render mode.
 *
 * Grouping this way keeps the sidebar to two headers instead of one per view,
 * so whichever view is showing gets the height it needs.
 */
export function LayerGroupSection({
  title,
  icon,
  views,
  activeId,
  onActiveChange,
  open,
  onOpenChange,
}: Props) {
  const active = views.find(view => view.id === activeId) ?? views[0]

  return (
    <CollapsibleSection
      title={title}
      icon={icon}
      className="min-h-0"
      style={{ height: '100%', minHeight: 0 }}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="flex flex-col h-full min-h-0 gap-2">
        <Tabs
          value={active.id}
          onValueChange={onActiveChange}
          variant="switch"
          className="flex-shrink-0"
        >
          <TabsList
            className="grid w-full"
            style={{ gridTemplateColumns: `repeat(${views.length}, minmax(0, 1fr))` }}
          >
            {views.map(view => (
              <TabsTrigger key={view.id} value={view.id}>
                {React.createElement(view.icon, { className: 'w-4 h-4 mr-2' })}
                {view.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex-1 min-h-0">{active.content}</div>
      </div>
    </CollapsibleSection>
  )
}
