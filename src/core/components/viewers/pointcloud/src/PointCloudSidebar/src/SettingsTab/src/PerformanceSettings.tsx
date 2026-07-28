'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Pin, TrendingDown, Zap, Box, Sparkles } from 'lucide-react'
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { PointCloudContext } from '../../../../../../../../store'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { Label } from '../../../../../../../ui/Label'
import { SliderWithInput, Slider } from '../../../../../../../ui/Slider'
import { Switch } from '../../../../../../../ui/Switch'
import { PointSizeType } from '../../../../../define'


// Enums
export enum SplatQuality {
  HIGH,
  STANDARD
}

// Custom Button Component
interface CustomButtonProps {
  active: boolean
  onClick: () => void
  disabled?: boolean
  icon: React.ReactNode
  label: string
}

const CustomButton: React.FC<CustomButtonProps> = ({
  active,
  onClick,
  disabled = false,
  icon,
  label
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background hover:bg-accent border-input'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className="flex items-center justify-center gap-1">
        {icon}
        {label}
      </div>
    </button>
  )
}

export function PerformanceSettings() {
  const t = useTranslations('PerformanceSettings')
  // Point Cloud context
  const { state: pointCloudState } = React.useContext(PointCloudContext)
  const { viewer } = pointCloudState.pointcloud

  // Point budget state (default: 0.5 million points = 500k)
  const [pointBudget, setPointBudget] = React.useState([0.5])

  // Quality state (Standard or High)
  const [quality, setQuality] = React.useState<SplatQuality>(SplatQuality.STANDARD)

  // Min/Max node size
  const [minNodeSize, setMinNodeSize] = React.useState([0])
  const [maxNodeSize, setMaxNodeSize] = React.useState([50])
  const [pointSizeType, setPointSizeType] = React.useState<PointSizeType>(PointSizeType.ADAPTIVE)

  // Octree box visibility
  const [showOctreeBox, setShowOctreeBox] = React.useState(false)

  // Point Budget Effect
  React.useEffect(() => {
    if (!viewer) return
    viewer.setPointBudget(pointBudget[0] * 1_000_000)
  }, [viewer, pointBudget])

  // Splat Quality Effect
  React.useEffect(() => {
    if (!viewer) return
    try {
      viewer.useHQ = quality === SplatQuality.HIGH
    } catch (err) {
      console.error('Failed to set quality:', err)
    }
  }, [viewer, quality])

  // Min Node Size Effect
  React.useEffect(() => {
    if (!viewer) return
    const pointcloud = viewer.scene.pointclouds[0]
    if (!pointcloud) return // viewer can exist before any cloud is loaded
    pointcloud.material.minSize = minNodeSize[0]
  }, [viewer, minNodeSize])

  // Max Node Size Effect
  React.useEffect(() => {
    if (!viewer) return
    const pointcloud = viewer.scene.pointclouds[0]
    if (!pointcloud) return
    pointcloud.material.maxSize = maxNodeSize[0]
  }, [viewer, maxNodeSize])

  // Point Size Type Effect
  React.useEffect(() => {
    if (!viewer) return
    const pointcloud = viewer.scene.pointclouds[0]
    if (!pointcloud) return
    pointcloud.material.pointSizeType = pointSizeType
  }, [viewer, pointSizeType])

  // Octree Box Effect
  React.useEffect(() => {
    if (!viewer) return
    try {
      viewer.setShowBoundingBox(showOctreeBox)
    } catch (err) {
      console.error('Failed to toggle octree box:', err)
    }
  }, [viewer, showOctreeBox])

  const handleMinNodeSizeChange = (value: number[]) => {
    if (value[0] <= maxNodeSize[0]) {
      setMinNodeSize(value)
    }
  }

  const handleMaxNodeSizeChange = (value: number[]) => {
    if (value[0] >= minNodeSize[0]) {
      setMaxNodeSize(value)
    }
  }

  return (
    <CollapsibleSection
      title={t('title')}
      chevronPosition="right"
      defaultOpen={false}
      icon={LR.Gauge}
    >
      <div className="space-y-6">
        {/* Point Budget */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{t('pointBudget')}</Label>
            <span className="text-xs text-gray-500">
              {(pointBudget[0] * 1_000_000).toLocaleString()} {t('points')}
            </span>
          </div>
          <SliderWithInput
            label={t('budget')}
            value={pointBudget}
            onValueChange={setPointBudget}
            min={0.5}
            max={50}
            step={0.5}
            unit="M"
            disabled={!viewer}
            className="mt-2"
          />
        </div>

        {/* Splat Quality */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('splatQuality')}</Label>
          <div className="flex gap-2">
            <button
              onClick={() => setQuality(SplatQuality.STANDARD)}
              disabled={!viewer}
              className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${
                quality === SplatQuality.STANDARD
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-accent border-input'
              } ${!viewer ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-center gap-1">
                <LR.Zap className="h-3 w-3" />
                {t('standard')}
              </div>
            </button>
            <button
              onClick={() => setQuality(SplatQuality.HIGH)}
              disabled={!viewer}
              className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${
                quality === SplatQuality.HIGH
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-accent border-input'
              } ${!viewer ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-center gap-1">
                <LR.Sparkles className="h-3 w-3" />
                {t('high')}
              </div>
            </button>
          </div>
        </div>

        {/* Node Size */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t('nodeSize')}</Label>

          {/* Point Size Type Selection */}
          <div className="space-y-2">
            <span className="text-xs text-gray-600">{t('pointSizeType')}</span>
            <div className="flex gap-2">
              <CustomButton
                active={pointSizeType === PointSizeType.FIXED}
                onClick={() => setPointSizeType(PointSizeType.FIXED)}
                disabled={!viewer}
                icon={<Pin size={14} />}
                label={t('fixed')}
              />
              <CustomButton
                active={pointSizeType === PointSizeType.ATTENUATED}
                onClick={() => setPointSizeType(PointSizeType.ATTENUATED)}
                disabled={!viewer}
                icon={<TrendingDown size={14} />}
                label={t('attenuated')}
              />
              <CustomButton
                active={pointSizeType === PointSizeType.ADAPTIVE}
                onClick={() => setPointSizeType(PointSizeType.ADAPTIVE)}
                disabled={!viewer}
                icon={<Zap size={14} />}
                label={t('adaptive')}
              />
            </div>
          </div>

          {/* Min Node Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">{t('minimum')}</span>
              <span className="text-xs text-gray-500">{minNodeSize[0]}px</span>
            </div>
            <Slider
              value={minNodeSize}
              onValueChange={handleMinNodeSizeChange}
              min={1}
              max={25}
              step={0.1}
              disabled={!viewer}
              className="w-full"
            />
          </div>

          {/* Max Node Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">{t('maximum')}</span>
              <span className="text-xs text-gray-500">{maxNodeSize[0]}px</span>
            </div>
            <Slider
              value={maxNodeSize}
              onValueChange={handleMaxNodeSizeChange}
              min={1}
              max={25}
              step={0.1}
              disabled={!viewer}
              className="w-full"
            />
          </div>
        </div>

        {/* Show Octree Box */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-gray-600" />
            <Label htmlFor="octree-box" className="text-sm font-medium cursor-pointer">
              {t('showOctreeBox')}
            </Label>
          </div>
          <Switch
            id="octree-box"
            checked={showOctreeBox}
            onCheckedChange={(checked) => setShowOctreeBox(checked)}
            disabled={!viewer}
          />
        </div>
      </div>
    </CollapsibleSection>
  )
}
