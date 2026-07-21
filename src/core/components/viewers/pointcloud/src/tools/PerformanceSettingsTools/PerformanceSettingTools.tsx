'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from "react";

import { PointCloudContext } from '../../../../../../store'
import { ToolbarSubmenu } from '../../../../../ToolbarSubmenu'
import { Label, Switch } from '../../../../../ui/'
import { DropdownMenuSeparator } from '../../../../../ui/DropdownMenu'
import { SliderWithInput, Slider } from '../../../../../ui/Slider'


// Custom tools
import { PointSizeType } from '../../../define'

import { NodeSizeSelectionTool } from './NodeSizeSelectionTool'
import PointBudgetTool from './PointBudgetTool'
import ShowOctreeBoxTool from './ShowOctreeBoxTool'
import SplatQualityTool from './SplatQualitySelection'
import { SplatQuality } from './SplatQualitySelection'


interface PerformanceSettingToolsProps {
  tool: any
}

export const PerformanceSettingTools: React.FC<PerformanceSettingToolsProps> = ({ tool }) => {
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

  return (
    <ToolbarSubmenu tool={tool}>
        <div className="p-4 w-80 space-y-4">
            <PointBudgetTool pointBudget={pointBudget} setPointBudget={setPointBudget} />
            <SplatQualityTool splatQuality={quality} setSplatQuality={setQuality} />

            <NodeSizeSelectionTool
                minNodeSize={minNodeSize}
                setMinNodeSize={setMinNodeSize}
                maxNodeSize={maxNodeSize}
                setMaxNodeSize={setMaxNodeSize}
                pointSizeType={pointSizeType}
                setPointSizeType={setPointSizeType}
                minLimit={1}
                maxLimit={25}
            />
            <ShowOctreeBoxTool showOctreeBox={showOctreeBox} setShowOctreeBox={setShowOctreeBox} />
    </div>
    </ToolbarSubmenu>
  )
}

export default PointBudgetTool