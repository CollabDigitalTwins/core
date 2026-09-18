'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { BimContext } from '../../../../../../../../store'

import {
  ElevationsTool,
  getElevationStagePercent,
} from '../../../../ElevationsTool'
import { exportDrawingToDxf } from '../../../../lib/exportDrawingToDxf'
import { useBuildingName } from '../../../../lib/useBuildingName'
import { useFriendlyIfcClassName } from '../../../../lib/useFriendlyIfcClassName'
import { ViewSectionList } from '../../../../lib/ViewSectionList'

import { ALL_MODELS, DrawingModelFilter } from './DrawingModelFilter'
import { LayerViewPanel } from './LayerViewPanel'

import type {
  ElevationEntry,
  ElevationLoadingStage,
  ElevationLoadingState} from '../../../../ElevationsTool';
import type { ViewListEntry } from '../../../../lib/viewSection'

interface CustomSectionProps {
  query?: string
  modelFilter?: string
  onModelFilterChange?: (value: string) => void
}

const IDLE_LOADING: ElevationLoadingState = { isLoading: false }

/** Drawings cut from a clipping plane, sharing `ElevationsTool` with the cardinal elevations. */
export function CustomSection({
  query = '',
  modelFilter = ALL_MODELS,
  onModelFilterChange,
}: CustomSectionProps) {
  const t = useTranslations('ViewSection')
  const friendlyClassName = useFriendlyIfcClassName()
  const buildingName = useBuildingName()

  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents } = bimState.bim

  const [entries, setEntries] = React.useState<ElevationEntry[]>([])
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [loading, setLoading] =
    React.useState<ElevationLoadingState>(IDLE_LOADING)
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [, setLayersTick] = React.useState(0)

  React.useEffect(() => {
    if (!bimComponents) return
    const tool = bimComponents.get(ElevationsTool)

    setEntries(tool.elevations)
    setActiveId(tool.activeId)

    const onElevations = (next: ElevationEntry[]) => setEntries([...next])
    const onActive = (entry: ElevationEntry | null) =>
      setActiveId(entry?.id ?? null)
    const onLoading = (state: ElevationLoadingState) => {
      setLoading(state)
      if (!state.isLoading) setPendingId(null)
    }
    const onLayers = () => setLayersTick((v) => v + 1)

    tool.onElevationsChanged.add(onElevations)
    tool.onActiveChanged.add(onActive)
    tool.onLoadingStateChanged.add(onLoading)
    tool.onLayersChanged.add(onLayers)

    return () => {
      tool.onElevationsChanged.remove(onElevations)
      tool.onActiveChanged.remove(onActive)
      tool.onLoadingStateChanged.remove(onLoading)
      tool.onLayersChanged.remove(onLayers)
    }
  }, [bimComponents])

  const customEntries = React.useMemo(
    () => entries.filter((entry) => entry.planeKey !== undefined),
    [entries],
  )

  const models = React.useMemo(() => {
    const ids = [...new Set(customEntries.map((entry) => entry.modelId))]
    return ids.map((id) => ({ id, label: buildingName(id) }))
  }, [customEntries, buildingName])

  const filteredEntries: ViewListEntry[] = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return customEntries
      .filter((entry) => modelFilter === ALL_MODELS || entry.modelId === modelFilter)
      .map((entry) => ({ id: entry.id, label: entry.label ?? t(entry.direction) }))
      .filter((row) => !q || row.label.toLowerCase().includes(q))
  }, [customEntries, query, t, modelFilter])

  const activeEntry = React.useMemo(
    () => customEntries.find((entry) => entry.id === activeId) ?? null,
    [customEntries, activeId],
  )

  const handleSelect = (entry: ViewListEntry) => {
    if (!bimComponents) return
    const tool = bimComponents.get(ElevationsTool)
    if (activeId === entry.id) {
      setPendingId(null)
      void tool.deactivate()
    } else {
      setPendingId(entry.id)
      void tool.activate(entry.id)
    }
  }

  const handleGenerateLines = () => {
    if (!bimComponents || !activeId) return
    void bimComponents.get(ElevationsTool).generateLines(activeId)
  }

  const handleExit = () => {
    if (!bimComponents) return
    setPendingId(null)
    void bimComponents.get(ElevationsTool).deactivate()
  }

  const handleDownload = (entry: ViewListEntry, event: React.MouseEvent) => {
    event.stopPropagation()
    if (!bimComponents) return
    const custom = customEntries.find((e) => e.id === entry.id)
    if (!custom?.drawing) return
    const fileName = `${buildingName(custom.modelId)}-${custom.label ?? custom.direction}`
    exportDrawingToDxf(bimComponents, custom.drawing, fileName)
  }

  const handleToggleLayer = (className: string, visible: boolean) => {
    if (!bimComponents || !activeId) return
    bimComponents.get(ElevationsTool).setLayerVisible(activeId, className, visible)
  }

  const handleChangeLayerColor = (className: string, color: number) => {
    if (!bimComponents || !activeId) return
    bimComponents.get(ElevationsTool).setLayerColor(activeId, className, color)
  }

  const stageMessage = (stage: ElevationLoadingStage | undefined): string =>
    stage && stage !== 'done' ? t(`stage.${stage}`) : t('loading')

  return (
    <LayerViewPanel
      count={filteredEntries.length}
      filter={
        <DrawingModelFilter
          models={models}
          value={modelFilter}
          onChange={onModelFilterChange ?? (() => undefined)}
          allLabel={t('allIfcFiles')}
        />
      }
    >
      <ViewSectionList
        entries={filteredEntries}
        activeId={activeEntry?.id ?? null}
        pendingId={pendingId}
        loading={loading}
        loadingPercent={getElevationStagePercent(loading.stage)}
        activeLayers={activeEntry?.layers ?? null}
        loadingMessage={stageMessage(loading.stage)}
        viewingPrefix={t('viewing')}
        exitLabel={t('exit')}
        goToLabel={t('goToElevation')}
        downloadLabel={t('downloadTitle')}
        layersLabel={t('layers')}
        toggleVisibilityLabel={t('toggleVisibility')}
        chooseColorLabel={t('chooseColor')}
        generateLinesLabel={t('generateLines')}
        canGenerateLines={!!activeEntry && !activeEntry.projected}
        onGenerateLines={handleGenerateLines}
        friendlyClassName={friendlyClassName}
        onSelect={handleSelect}
        onExit={handleExit}
        onDownload={handleDownload}
        onToggleLayer={handleToggleLayer}
        onChangeLayerColor={handleChangeLayerColor}
      />
    </LayerViewPanel>
  )
}
