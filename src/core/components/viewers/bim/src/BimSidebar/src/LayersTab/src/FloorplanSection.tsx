'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { BimContext } from '../../../../../../../../store'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { FloorplanIcon } from '../../../../../../../ui/Icons/FloorPlanIcon'
import {
  FloorplanTool,
  FloorplanEntry,
  FloorplanLoadingStage,
  FloorplanLoadingState,
  getFloorplanStagePercent,
} from '../../../../FloorplanTool'
import { exportDrawingToDxf } from '../../../../lib/exportDrawingToDxf'
import { TrueNorthPopover } from '../../../../lib/TrueNorthPopover'
import { useBuildingName } from '../../../../lib/useBuildingName'
import { useFriendlyIfcClassName } from '../../../../lib/useFriendlyIfcClassName'
import { ViewSectionList } from '../../../../lib/ViewSectionList'
import { ViewListEntry } from '../../../../lib/viewSection'

interface FloorplanSectionProps {
  query?: string
}

const IDLE_LOADING: FloorplanLoadingState = { isLoading: false }

export function FloorplanSection({ query = '' }: FloorplanSectionProps) {
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
  const [northAngle, setNorthAngle] = React.useState(0)
  const [pickingNorth, setPickingNorth] = React.useState(false)
  /** Bump on every layers-changed event to re-read the active entry's
   *  layer metadata (the entry mutates in place inside the tool). */
  const [, setLayersTick] = React.useState(0)

  React.useEffect(() => {
    if (!bimComponents) return
    const tool = bimComponents.get(FloorplanTool)

    setEntries(tool.drawings)
    setActiveId(tool.activeDrawingId)
    setNorthAngle(tool.northAngle)
    setPickingNorth(tool.isPickingNorth)

    const onDrawings = (next: FloorplanEntry[]) => setEntries([...next])
    const onActive = (entry: FloorplanEntry | null) =>
      setActiveId(entry?.id ?? null)
    const onLoading = (state: FloorplanLoadingState) => {
      setLoading(state)
      if (!state.isLoading) setPendingId(null)
    }
    const onLayers = () => setLayersTick((v) => v + 1)
    const onNorth = (angle: number) => setNorthAngle(angle)
    const onPicking = (picking: boolean) => setPickingNorth(picking)

    tool.onDrawingsChanged.add(onDrawings)
    tool.onActiveDrawingChanged.add(onActive)
    tool.onGenerationStateChanged.add(onLoading)
    tool.onLayersChanged.add(onLayers)
    tool.onNorthAngleChanged.add(onNorth)
    tool.onPickingNorthChanged.add(onPicking)

    return () => {
      tool.onDrawingsChanged.remove(onDrawings)
      tool.onActiveDrawingChanged.remove(onActive)
      tool.onGenerationStateChanged.remove(onLoading)
      tool.onLayersChanged.remove(onLayers)
      tool.onNorthAngleChanged.remove(onNorth)
      tool.onPickingNorthChanged.remove(onPicking)
    }
  }, [bimComponents])

  const filteredEntries: ViewListEntry[] = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries
      .filter((entry) => !q || entry.name.toLowerCase().includes(q))
      .map((entry) => ({ id: entry.id, label: entry.name }))
  }, [entries, query])

  const activeEntry = React.useMemo(
    () => entries.find((entry) => entry.id === activeId) ?? null,
    [entries, activeId],
  )

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
    // Bake the on-screen orientation into the exported geometry. `northAngle`
    // is the camera azimuth, which rotates the floorplan clockwise on screen;
    // the DXF exporter rotates its image counter-clockwise, so we negate to
    // make the DXF land in the same orientation the user sees.
    exportDrawingToDxf(bimComponents, fpEntry.drawing, fileName, -northAngle)
  }

  const handleToggleLayer = (className: string, visible: boolean) => {
    if (!bimComponents || !activeId) return
    // Group-level entries (Fill / Cut) are 3D model highlights, not drawing
    // layers — their toggle has no per-layer effect so we skip it here.
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
    if (!bimComponents) return
    bimComponents.get(FloorplanTool).setNorthAngle(degrees)
  }

  const handleStartPickNorth = () => {
    if (!bimComponents) return
    bimComponents.get(FloorplanTool).startPickNorth()
  }

  const handleCancelPickNorth = () => {
    if (!bimComponents) return
    bimComponents.get(FloorplanTool).cancelPickNorth()
  }

  const stageMessage = (stage: FloorplanLoadingStage | undefined): string =>
    stage && stage !== 'done' ? t(`stage.${stage}`) : t('loading')

  return (
    <CollapsibleSection
      title={t('floorplanTitle')}
      icon={FloorplanIcon}
      className="overflow-y-auto"
      style={{ height: '100%', minHeight: 0 }}
      itemCount={filteredEntries.length}
      headerActions={
        <TrueNorthPopover
          northAngle={northAngle}
          pickingNorth={pickingNorth}
          disabled={!activeId}
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
        friendlyClassName={friendlyClassName}
        onSelect={handleSelect}
        onExit={handleExit}
        onDownload={handleDownload}
        onToggleLayer={handleToggleLayer}
        onChangeLayerColor={handleChangeLayerColor}
      />
    </CollapsibleSection>
  )
}
