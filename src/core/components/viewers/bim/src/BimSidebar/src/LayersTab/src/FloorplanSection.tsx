'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useFilesByBuildingId } from '../../../../../../../../hooks/files/files'
import { BimContext, BuildingsContext } from '../../../../../../../../store'

import {
  FloorplanTool,
  getFloorplanStagePercent,
} from '../../../../FloorplanTool'
import { exportDrawingToDxf } from '../../../../lib/exportDrawingToDxf'
import { TrueNorthPopover } from '../../../../lib/TrueNorthPopover'
import { useBuildingName } from '../../../../lib/useBuildingName'
import { useFriendlyIfcClassName } from '../../../../lib/useFriendlyIfcClassName'
import { useProjectNorth } from '../../../../lib/useProjectNorth'
import { ViewSectionList } from '../../../../lib/ViewSectionList'

import { ALL_MODELS, DrawingModelFilter } from './DrawingModelFilter'
import { LayerViewPanel } from './LayerViewPanel'

import type {
  FloorplanEntry,
  FloorplanLoadingStage,
  FloorplanLoadingState} from '../../../../FloorplanTool';
import type { ViewListEntry } from '../../../../lib/viewSection'

interface FloorplanSectionProps {
  query?: string
  modelFilter?: string
  onModelFilterChange?: (value: string) => void
}

const IDLE_LOADING: FloorplanLoadingState = { isLoading: false }

export function FloorplanSection({
  query = '',
  modelFilter = ALL_MODELS,
  onModelFilterChange,
}: FloorplanSectionProps) {
  const t = useTranslations('ViewSection')
  const friendlyClassName = useFriendlyIfcClassName()
  const buildingName = useBuildingName()

  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents } = bimState.bim

  const [entries, setEntries] = React.useState<FloorplanEntry[]>([])
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [loading, setLoading] =
    React.useState<FloorplanLoadingState>(IDLE_LOADING)
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [, setNorthTick] = React.useState(0)
  const [pickingNorth, setPickingNorth] = React.useState(false)
  // The tool mutates the active entry's layers in place, so a change has to force a re-render.
  const [, setLayersTick] = React.useState(0)

  React.useEffect(() => {
    if (!bimComponents) return
    const tool = bimComponents.get(FloorplanTool)

    setEntries(tool.drawings)
    setActiveId(tool.activeDrawingId)
    setPickingNorth(tool.isPickingNorth)

    const onDrawings = (next: FloorplanEntry[]) => setEntries([...next])
    const onActive = (entry: FloorplanEntry | null) =>
      setActiveId(entry?.id ?? null)
    const onLoading = (state: FloorplanLoadingState) => {
      setLoading(state)
      if (!state.isLoading) setPendingId(null)
    }
    const onLayers = () => setLayersTick((v) => v + 1)
    const onPicking = (picking: boolean) => setPickingNorth(picking)

    tool.onDrawingsChanged.add(onDrawings)
    tool.onActiveDrawingChanged.add(onActive)
    tool.onGenerationStateChanged.add(onLoading)
    tool.onLayersChanged.add(onLayers)
    tool.onPickingNorthChanged.add(onPicking)

    return () => {
      tool.onDrawingsChanged.remove(onDrawings)
      tool.onActiveDrawingChanged.remove(onActive)
      tool.onGenerationStateChanged.remove(onLoading)
      tool.onLayersChanged.remove(onLayers)
      tool.onPickingNorthChanged.remove(onPicking)
    }
  }, [bimComponents])

  const models = React.useMemo(() => {
    const ids = [...new Set(entries.map((entry) => entry.modelId))]
    return ids.map((id) => ({ id, label: buildingName(id) }))
  }, [entries, buildingName])

  const filteredEntries: ViewListEntry[] = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries
      .filter((entry) => modelFilter === ALL_MODELS || entry.modelId === modelFilter)
      .filter((entry) => !q || entry.name.toLowerCase().includes(q))
      .map((entry) => ({ id: entry.id, label: entry.name }))
  }, [entries, query, modelFilter])

  const activeEntry = React.useMemo(
    () => entries.find((entry) => entry.id === activeId) ?? null,
    [entries, activeId],
  )

  const { state: buildingsState } = React.useContext(BuildingsContext)
  const buildingFiles = useFilesByBuildingId(buildingsState.buildings.building?.id ?? 0).files
  const activeFile = React.useMemo(
    () => (activeEntry ? buildingFiles.find((file) => file.name === activeEntry.modelId) ?? null : null),
    [buildingFiles, activeEntry],
  )
  const { projectNorthOf, setProjectNorth, pickProjectNorth } = useProjectNorth()
  const northDegrees = activeFile ? (projectNorthOf(activeFile) * 180) / Math.PI : 0

  const handleSelect = (entry: ViewListEntry) => {
    if (!bimComponents) return
    const tool = bimComponents.get(FloorplanTool)
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
    void bimComponents.get(FloorplanTool).generateLines(activeId)
  }

  const handleExit = () => {
    if (!bimComponents) return
    setPendingId(null)
    void bimComponents.get(FloorplanTool).deactivate()
  }

  const handleDownload = (entry: ViewListEntry, event: React.MouseEvent) => {
    event.stopPropagation()
    if (!bimComponents) return
    const fpEntry = entries.find((e) => e.id === entry.id)
    if (!fpEntry?.drawing) return
    const fileName = `${buildingName(fpEntry.modelId)}-${fpEntry.name}`
    exportDrawingToDxf(bimComponents, fpEntry.drawing, fileName)
  }

  const handleToggleLayer = (className: string, visible: boolean) => {
    if (!bimComponents || !activeId) return
    // Fill and Cut group rows are 3D highlights, not drawing layers, so they have nothing to toggle.
    if (className.startsWith('DrawingLayers.')) return
    bimComponents.get(FloorplanTool).setLayerVisible(activeId, className, visible)
  }

  const handleChangeLayerColor = (className: string, color: number) => {
    if (!bimComponents || !activeId) return
    const tool = bimComponents.get(FloorplanTool)
    if (className === 'DrawingLayers.fill') {
      void tool.setFillGroupColor(activeId, color)
    } else if (className === 'DrawingLayers.cut') {
      void tool.setCutGroupColor(activeId, color)
    } else {
      void tool.setLayerColor(activeId, className, color)
    }
  }

  const handleChangeNorthAngle = (degrees: number) => {
    if (!activeFile) return
    void setProjectNorth(activeFile, (degrees * Math.PI) / 180).then(() => setNorthTick((v) => v + 1))
  }

  const handleStartPickNorth = () => {
    if (!activeFile) return
    void pickProjectNorth(activeFile).then(() => setNorthTick((v) => v + 1))
  }

  const handleCancelPickNorth = () => {
    if (!bimComponents) return
    bimComponents.get(FloorplanTool).cancelPickNorth()
  }

  const stageMessage = (stage: FloorplanLoadingStage | undefined): string =>
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
      actions={
        <TrueNorthPopover
          northAngle={northDegrees}
          pickingNorth={pickingNorth}
          disabled={!activeFile}
          onChangeAngle={handleChangeNorthAngle}
          onStartPick={handleStartPickNorth}
          onCancelPick={handleCancelPickNorth}
        />
      }
    >
      <ViewSectionList
        entries={filteredEntries}
        activeId={activeId}
        pendingId={pendingId}
        loading={loading}
        loadingPercent={getFloorplanStagePercent(loading.stage)}
        activeLayers={activeEntry?.layers ?? null}
        loadingMessage={stageMessage(loading.stage)}
        viewingPrefix={t('viewing')}
        exitLabel={t('exit')}
        goToLabel={t('goToLevel')}
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
