"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Button, Switch } from '../../../../../components/ui/'
import { pluginDatasetId } from '../../../../../plugins/host/pluginDatasetId'
import { MapContext, DatasetsContext } from '../../../../../store'
import { ViewerNames } from '../../../../../types/dbTypes'
import { LegendCard } from '../../../../ui/LegendCard'
import { useSidebar } from '../../../../ui/Sidebar'
import { legendKey, PluginLegendSection } from '../../../shared/legends/PluginLegendSection'
import { usePluginLegends } from '../../../shared/legends/usePluginLegends'
import { ClusterManager } from '../../utils/ClusterManager'

import { isRasterDataset } from '../src/mapServices'
import { reorderedDatasets, sortByOrder } from '../utils'

import { DatasetStylePanel } from './src/DatasetStylePanel'
import { useDatasetLoadDisplay } from './src/useDatasetLoadDisplay'
import { hasWmsTimeControl, WmsDatasetControls } from './src/WmsDatasetControls'

import type { Dataset, BuildingDataset as RawBuildingDataset } from '../../../../../types/datasetTypes'
import type {
  DragEndEvent} from '@dnd-kit/core';



type BuildingDataset = RawBuildingDataset & Dataset

// Type guard to check if dataset is a building dataset
const isBuildingDataset = (dataset: Dataset): dataset is BuildingDataset =>
  dataset.type === 'buildings' && 'data' in dataset

interface SortableDatasetRowProps {
  dataset: Dataset
  onToggleDataset: (dataset: Dataset) => void
  onToggleStyle: (datasetName: string) => void
  styleOpen: boolean
  legend?: React.ReactNode
}


const SortableDatasetRow: React.FC<SortableDatasetRowProps> = ({
  dataset,
  onToggleDataset,
  onToggleStyle,
  styleOpen,
  legend,
}) => {
  const t = useTranslations('DatasetManagerMenu')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dataset.name })
  const isRaster = isRasterDataset(dataset)
  const isStylable = !dataset.drawnByPlugin
  const name = dataset.name.replaceAll('_', ' ')
  const { indicator, summary } = useDatasetLoadDisplay(dataset.name)
  const source = dataset.portal?.name ?? dataset.publisher
  const subtitle = summary ?? source
  const subtitleTooltip = [source, summary].filter(Boolean).join(' · ')

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="group rounded-md"
    >
      <div className="flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-muted/50">
        <button
          type="button"
          aria-label={t('reorder')}
          className="cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <LR.GripVertical className="h-3.5 w-3.5" aria-hidden />
        </button>
        <Switch
          checked={dataset.visible !== false}
          onCheckedChange={() => onToggleDataset(dataset)}
          aria-label={name}
          className="shrink-0"
          style={dataset.visible === false || isRaster ? {} : { backgroundColor: dataset.layerColor.color }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-5" title={name}>{name}</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground" title={subtitleTooltip}>{subtitle}</p>}
        </div>
        {indicator}
        {isStylable && (
          <Button
            variant={styleOpen ? 'secondary' : 'ghost'}
            size="icon"
            aria-expanded={styleOpen}
            aria-label={t(styleOpen ? 'closeStyle' : 'style')}
            title={t(styleOpen ? 'closeStyle' : 'style')}
            onClick={() => onToggleStyle(dataset.name)}
            className="h-7 w-7 shrink-0"
          >
            {styleOpen ? <LR.X className="h-4 w-4" aria-hidden /> : <LR.Settings2 className="h-4 w-4" aria-hidden />}
          </Button>
        )}
      </div>
      {legend && <div className="pb-1.5 pl-9 pr-2">{legend}</div>}
      {isStylable && styleOpen && (
        <div className="mb-1.5 ml-9 mr-1.5 rounded-md border bg-muted/30">
          <DatasetStylePanel dataset={dataset} />
        </div>
      )}
    </li>
  )
}

export default function DatasetManagerMenu() {
  // Translation
  const t = useTranslations('DatasetManagerMenu')

  const { state: mapState, dispatch: mapDispatch } = React.useContext(MapContext)
  const { map } = mapState.map

  const { state: datasetState, dispatch: datasetDispatch } = React.useContext(DatasetsContext)
  const { addedDatasets } = datasetState.datasets

  const [open, setOpen] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [expandedDatasets, setExpandedDatasets] = React.useState<Set<string>>(new Set())

  const legends = usePluginLegends(ViewerNames.map)
  const datasetLegends = legends.registrations.filter(registration => registration.dataset)
  const standaloneLegends = legends.registrations.filter(registration => !registration.dataset && legends.isActive(registration))
  const cardCount = addedDatasets.length + standaloneLegends.length

  const pluginLegendFor = (dataset: Dataset) =>
    datasetLegends.find(candidate => pluginDatasetId(candidate.pluginId, candidate.dataset ?? '') === dataset.id)

  const legendFor = (dataset: Dataset) => {
    if (hasWmsTimeControl(dataset)) return <WmsDatasetControls dataset={dataset} />
    const registration = pluginLegendFor(dataset)
    if (!registration) return undefined
    return (
      <PluginLegendSection
        registration={registration}
        config={legends.configs[registration.pluginId]}
        showTitle={false}
      />
    )
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const sortedDatasets = React.useMemo(() => sortByOrder(addedDatasets), [addedDatasets])

  React.useEffect(() => {
    if (!map || !addedDatasets) return

    const clusterManager = new ClusterManager(map)

    const sortedDatasets = [...addedDatasets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    for (const dataset of sortedDatasets) {
      if (isBuildingDataset(dataset)) {
        if (dataset.visible === false) {
          clusterManager.remove(dataset.name)
        }
        else {
          clusterManager.create(dataset)
          clusterManager.toggleVisibility(dataset.name, true)
        }
      }
    }
  }, [map, addedDatasets])

  // Remove clusters for datasets no longer present
  const previousNamesRef = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    if (!map) return
    const clusterManager = new ClusterManager(map)
    const currentNames = new Set(
      addedDatasets.filter(isBuildingDataset).map(ds => ds.name),
    )
    const removedNames = [...previousNamesRef.current].filter(
      name => !currentNames.has(name),
    )
    for (const datasetName of removedNames) {
      clusterManager.remove(datasetName)
    }
    previousNamesRef.current = currentNames
  }, [map, addedDatasets])

  const onToggleDataset = (dataset: Dataset) => {
    const datasetId = dataset.id;
    datasetDispatch({ type: 'TOGGLE_DATASET_VISIBILITY', payload: { datasetId } })
  }

  const toggleDatasetExpansion = (datasetName: string) => {
    setExpandedDatasets((prev) => {
      const newSet = new Set(prev)
      newSet.has(datasetName) ? newSet.delete(datasetName) : newSet.add(datasetName)
      return newSet
    })
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const reordered = over ? reorderedDatasets(sortedDatasets, String(active.id), String(over.id)) : undefined
    if (reordered) datasetDispatch({ type: 'REORDER_DATASETS', payload: { reorderedDatasets: reordered } })
  }

  const openAnimation = `
    pointer-events-auto 
    transform 
    transition-all 
    duration-200
    data-[state=open]:animate-in 
    data-[state=closed]:animate-out 
    data-[state=closed]:fade-out-0 
    data-[state=open]:fade-in-0 
    data-[state=closed]:zoom-out-95 
    data-[state=open]:zoom-in-95
  `

  React.useEffect(() => {
    setMenuOpen(cardCount > 0)
  }, [cardCount])

  const showsLegend = standaloneLegends.length > 0
    || addedDatasets.some(dataset => hasWmsTimeControl(dataset) || pluginLegendFor(dataset) !== undefined)

  React.useEffect(() => {
    if (showsLegend) setOpen(true)
  }, [showsLegend])

  const {openInfo} = useSidebar()

  return (
    <>
      {legends.probes}
      {!openInfo && cardCount > 0 && (
        <div data-state={menuOpen ? 'open' : 'closed'} className={openAnimation}>
          <LegendCard
            title={t('appliedLayers', { count: cardCount })}
            count={cardCount}
            open={open}
            onOpenChange={setOpen}
            className="w-96"
          >
            <div className="px-1.5 py-1.5">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedDatasets.map(dataset => dataset.name)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="flex flex-col gap-0.5">
                    {sortedDatasets.map(dataset => (
                      <SortableDatasetRow
                        key={dataset.name}
                        dataset={dataset}
                        onToggleDataset={onToggleDataset}
                        onToggleStyle={toggleDatasetExpansion}
                        styleOpen={expandedDatasets.has(dataset.name)}
                        legend={legendFor(dataset)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
              {standaloneLegends.map(registration => (
                <PluginLegendSection
                  key={legendKey(registration)}
                  registration={registration}
                  config={legends.configs[registration.pluginId]}
                />
              ))}
            </div>
          </LegendCard>
        </div>
      )}
    </>
  )
}
