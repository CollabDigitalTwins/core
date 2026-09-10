'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { FloorplanIcon } from '../../../../../../ui/Icons/FloorPlanIcon'
import { ViewerSidebarPanel } from '../../../../../../ui/ViewerSidebar/Panel'
import { useResizableSections } from '../../../../../../ui/ViewerSidebar/useResizableSections'

import { AppearanceProvider } from './src/AppearanceProvider'
import { ALL_MODELS } from './src/DrawingModelFilter'
import { ElevationSection } from './src/ElevationsSection'
import { FloorplanSection } from './src/FloorplanSection'
import { IfcClassesSection } from './src/IfcClassesSection'
import { LayerGroupSection } from './src/LayerGroupSection'
import { SpatialStructureSection } from './src/SpatialStructureSection'

type GroupId = 'drawings' | 'classifier'

const GROUP_IDS: readonly GroupId[] = ['drawings', 'classifier']

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
  const tSidebar = useTranslations('ViewerSidebar')

  const [searchQuery, setSearchQuery] = React.useState('')
  const [drawingModelFilter, setDrawingModelFilter] = React.useState(ALL_MODELS)
  const [openGroups, setOpenGroups] = React.useState<Record<GroupId, boolean>>({
    drawings: true,
    classifier: true,
  })
  const [activeView, setActiveView] = React.useState({
    drawings: 'floorplans',
    classifier: 'spatial',
  })

  const { layoutRef, gridTemplateRows, separatorAfter, beginResize } = useResizableSections({
    ids: GROUP_IDS,
    defaultWeights: DEFAULT_WEIGHTS,
    minWeights: MIN_WEIGHTS,
    open: openGroups,
  })

  const setOpen = (id: GroupId) => (open: boolean) =>
    setOpenGroups(current => ({ ...current, [id]: open }))

  const setView = (id: GroupId) => (view: string) =>
    setActiveView(current => ({ ...current, [id]: view }))

  return (
    <AppearanceProvider>
      <ViewerSidebarPanel
        variant="sections"
        className="space-y-0 gap-0 py-3"
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: t('searchPlaceholder'),
        }}
      >
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
                  content: (
                    <FloorplanSection
                      query={searchQuery}
                      modelFilter={drawingModelFilter}
                      onModelFilterChange={setDrawingModelFilter}
                    />
                  ),
                },
                {
                  id: 'elevations',
                  label: t('elevationsTab'),
                  icon: LR.House,
                  content: (
                    <ElevationSection
                      query={searchQuery}
                      modelFilter={drawingModelFilter}
                      onModelFilterChange={setDrawingModelFilter}
                    />
                  ),
                },
              ]}
            />
          </div>

          {separatorAfter('drawings') && (
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label={tSidebar('resizeSectionsLabel')}
              className="group flex items-center justify-center cursor-row-resize select-none touch-none"
              onPointerDown={beginResize('drawings')}
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
      </ViewerSidebarPanel>
    </AppearanceProvider>
  )
}
