'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { FloorplanIcon } from '../../../../../../ui/Icons/FloorPlanIcon'
import { SearchInput } from '../../../../../../ui/SearchInput'

import { AppearanceProvider } from './src/AppearanceProvider'
import { ElevationSection } from './src/ElevationsSection'
import { FloorplanSection } from './src/FloorplanSection'
import { IfcClassesSection } from './src/IfcClassesSection'
import { LayerGroupSection } from './src/LayerGroupSection'
import { SpatialStructureSection } from './src/SpatialStructureSection'

type GroupId = 'drawings' | 'classifier'

/** Height of the drag handle between the two groups, in pixels. */
const SEPARATOR_HEIGHT = 8

/** Share of the flexible height each group takes, and the least it may shrink to. */
const DEFAULT_WEIGHTS: Record<GroupId, number> = { drawings: 45, classifier: 55 }
const MIN_WEIGHTS: Record<GroupId, number> = { drawings: 20, classifier: 25 }

/**
 * The "Layers" sidebar tab: a shared search bar over two collapsible groups.
 *
 * **Drawings** switches between floorplans and elevations; **Classifier**
 * switches between the IFC spatial tree and the IFC class list. Grouping the
 * four views behind two segmented switchers (the same control the Settings tab
 * uses for render mode) keeps one view at full height instead of splitting the
 * sidebar four ways.
 *
 * The two groups share the vertical space through a draggable separator, and a
 * collapsed group shrinks to its header so it hands its space to the other one.
 */
export function LayersTab() {
  const t = useTranslations('LayersTab')

  const [searchQuery, setSearchQuery] = React.useState('')
  const [openGroups, setOpenGroups] = React.useState<Record<GroupId, boolean>>({
    drawings: true,
    classifier: true,
  })
  const [activeView, setActiveView] = React.useState({
    drawings: 'floorplans',
    classifier: 'spatial',
  })
  const [weights, setWeights] = React.useState<Record<GroupId, number>>(DEFAULT_WEIGHTS)

  const layoutRef = React.useRef<HTMLDivElement | null>(null)
  const dragStateRef = React.useRef<{
    startY: number
    startDrawings: number
    /** Pixels per weight unit, so pointer movement maps onto the weights. */
    pixelsPerUnit: number
  } | null>(null)

  const bothOpen = openGroups.drawings && openGroups.classifier

  const handlePointerMove = React.useCallback((event: PointerEvent) => {
    const drag = dragStateRef.current
    if (!drag || drag.pixelsPerUnit <= 0) return

    const total = DEFAULT_WEIGHTS.drawings + DEFAULT_WEIGHTS.classifier
    const delta = (event.clientY - drag.startY) / drag.pixelsPerUnit
    const next = Math.min(
      total - MIN_WEIGHTS.classifier,
      Math.max(MIN_WEIGHTS.drawings, drag.startDrawings + delta),
    )

    setWeights({ drawings: next, classifier: total - next })
  }, [])

  const stopDragging = React.useCallback(() => {
    dragStateRef.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopDragging)
    window.removeEventListener('pointercancel', stopDragging)
  }, [handlePointerMove])

  React.useEffect(() => stopDragging, [stopDragging])

  const beginResize = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const layout = layoutRef.current
      if (!layout) return

      const total = DEFAULT_WEIGHTS.drawings + DEFAULT_WEIGHTS.classifier
      // The separator itself is the only fixed row while both groups are open.
      const flexibleHeight = layout.clientHeight - SEPARATOR_HEIGHT
      if (flexibleHeight <= 0) return

      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      dragStateRef.current = {
        startY: event.clientY,
        startDrawings: weights.drawings,
        pixelsPerUnit: flexibleHeight / total,
      }

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', stopDragging)
      window.addEventListener('pointercancel', stopDragging)
    },
    [handlePointerMove, stopDragging, weights.drawings],
  )

  const setOpen = (id: GroupId) => (open: boolean) =>
    setOpenGroups(current => ({ ...current, [id]: open }))

  const setView = (id: GroupId) => (view: string) =>
    setActiveView(current => ({ ...current, [id]: view }))

  // A collapsed group is `auto` (its header only); the expanded ones split what
  // is left. With one collapsed, the other simply takes the rest.
  const rowFor = (id: GroupId) => (openGroups[id] ? `${weights[id]}fr` : 'auto')
  const gridTemplateRows = bothOpen
    ? `${rowFor('drawings')} ${SEPARATOR_HEIGHT}px ${rowFor('classifier')}`
    : `${rowFor('drawings')} ${rowFor('classifier')}`

  return (
    <AppearanceProvider>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Shared search bar — filters every view below. */}
        <div className="px-4 py-3 border-b flex-shrink-0">
          <SearchInput
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div ref={layoutRef} className="grid flex-1 min-h-0" style={{ gridTemplateRows }}>
          <div className="min-h-0 overflow-hidden">
            <LayerGroupSection
              title={t('drawingsGroup')}
              icon={FloorplanIcon}
              open={openGroups.drawings}
              onOpenChange={setOpen('drawings')}
              activeId={activeView.drawings}
              onActiveChange={setView('drawings')}
              views={[
                {
                  id: 'floorplans',
                  label: t('floorplansTab'),
                  icon: FloorplanIcon,
                  content: <FloorplanSection query={searchQuery} />,
                },
                {
                  id: 'elevations',
                  label: t('elevationsTab'),
                  icon: LR.House,
                  content: <ElevationSection query={searchQuery} />,
                },
              ]}
            />
          </div>

          {bothOpen && (
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label={t('resizeSectionsLabel')}
              className="group flex items-center justify-center cursor-row-resize select-none touch-none"
              onPointerDown={beginResize}
            >
              <div className="h-px w-full bg-border transition-colors group-hover:bg-primary/50" />
            </div>
          )}

          <div className="min-h-0 overflow-hidden">
            <LayerGroupSection
              title={t('classifierGroup')}
              icon={LR.ListTree}
              open={openGroups.classifier}
              onOpenChange={setOpen('classifier')}
              activeId={activeView.classifier}
              onActiveChange={setView('classifier')}
              views={[
                {
                  id: 'spatial',
                  label: t('spatialTab'),
                  icon: LR.ListTree,
                  content: <SpatialStructureSection searchQuery={searchQuery} />,
                },
                {
                  id: 'classes',
                  label: t('classesTab'),
                  icon: LR.Tags,
                  content: <IfcClassesSection searchQuery={searchQuery} />,
                },
              ]}
            />
          </div>
        </div>
      </div>
    </AppearanceProvider>
  )
}
