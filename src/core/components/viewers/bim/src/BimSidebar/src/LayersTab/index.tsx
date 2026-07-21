'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { SearchInput } from '../../../../../../ui/'

import { ElevationSection } from './src/ElevationsSection'
import { FloorplanSection } from './src/FloorplanSection'
import { SpatialStructureSection } from './src/SpatialStructureSection'

interface LayersTabProps {
  modelId: string | null
}

/**
 * The "Layers" sidebar tab. Hosts a single shared search bar plus three
 * equal-height sections (floorplans, elevations, spatial-structure tree).
 * Each section component owns its own data + event subscriptions.
 */
export function LayersTab({ modelId }: LayersTabProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [panelSizes, setPanelSizes] = React.useState<[number, number, number]>([44, 18, 38])
  const layoutRef = React.useRef<HTMLDivElement | null>(null)
  const dragStateRef = React.useRef<{
    divider: 'top' | 'bottom'
    startY: number
    startSizes: [number, number, number]
    containerHeight: number
  } | null>(null)

  const handlePointerMove = React.useCallback((event: PointerEvent) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.containerHeight <= 0) return

    const deltaPercent = ((event.clientY - dragState.startY) / dragState.containerHeight) * 100
    const minimumSizes: [number, number, number] = [24, 12, 28]

    if (dragState.divider === 'top') {
      const maxTop = 100 - minimumSizes[1] - dragState.startSizes[2]
      const nextTop = Math.min(maxTop, Math.max(minimumSizes[0], dragState.startSizes[0] + deltaPercent))
      const nextMiddle = 100 - nextTop - dragState.startSizes[2]
      setPanelSizes([nextTop, nextMiddle, dragState.startSizes[2]])
      return
    }

    const maxMiddle = 100 - dragState.startSizes[0] - minimumSizes[2]
    const nextMiddle = Math.min(maxMiddle, Math.max(minimumSizes[1], dragState.startSizes[1] + deltaPercent))
    const nextBottom = 100 - dragState.startSizes[0] - nextMiddle
    setPanelSizes([dragState.startSizes[0], nextMiddle, nextBottom])
  }, [])

  const stopDragging = React.useCallback(() => {
    dragStateRef.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopDragging)
    window.removeEventListener('pointercancel', stopDragging)
  }, [handlePointerMove])

  const beginResize = React.useCallback(
    (divider: 'top' | 'bottom') => (event: React.PointerEvent<HTMLDivElement>) => {
      if (!layoutRef.current) return

      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      dragStateRef.current = {
        divider,
        startY: event.clientY,
        startSizes: [...panelSizes],
        containerHeight: layoutRef.current.clientHeight,
      }

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', stopDragging)
      window.addEventListener('pointercancel', stopDragging)
    },
    [handlePointerMove, panelSizes, stopDragging],
  )

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Shared search bar — filters every section below. */}
      <div className="px-4 py-3 border-b flex-shrink-0">
        <SearchInput
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div
        ref={layoutRef}
        className="grid flex-1 min-h-0"
        style={{ gridTemplateRows: `${panelSizes[0]}fr 8px ${panelSizes[1]}fr 8px ${panelSizes[2]}fr` }}
      >
        <div className="min-h-0 overflow-hidden">
          <FloorplanSection query={searchQuery} />
        </div>
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize floorplans and elevations"
          className="group flex items-center justify-center cursor-row-resize select-none touch-none"
          onPointerDown={beginResize('top')}
        >
          <div className="h-px w-full bg-border transition-colors group-hover:bg-primary/50" />
        </div>
        <div className="min-h-0 overflow-hidden">
          <ElevationSection query={searchQuery} />
        </div>
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize elevations and spatial structure"
          className="group flex items-center justify-center cursor-row-resize select-none touch-none"
          onPointerDown={beginResize('bottom')}
        >
          <div className="h-px w-full bg-border transition-colors group-hover:bg-primary/50" />
        </div>
        <div className="min-h-0 overflow-hidden">
          <SpatialStructureSection searchQuery={searchQuery} modelId={modelId} />
        </div>
      </div>
    </div>
  )
}
