'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Pin, TrendingDown, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from "react";

import { PointCloudContext } from '../../../../../../store'
import { Label } from '../../../../../ui/Label'
import { SliderWithInput, Slider } from '../../../../../ui/Slider'
import { PointSizeType } from '../../../define'

export interface CustomButtonProps {
    active: boolean;
    onClick: () => void;
    disabled?: boolean;
    icon: React.ReactNode;
    label: string;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
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
    );
};

interface NodeSizeSelectionToolProps {
    minNodeSize: number[];
    setMinNodeSize: (value: number[]) => void;
    maxNodeSize: number[];
    setMaxNodeSize: (value: number[]) => void;
    pointSizeType: PointSizeType;
    setPointSizeType: (type: PointSizeType) => void;
    minLimit: number;
    maxLimit: number;

}

export const NodeSizeSelectionTool: React.FC<NodeSizeSelectionToolProps> = ({
    minNodeSize,
    setMinNodeSize,
    maxNodeSize,
    setMaxNodeSize,
    pointSizeType,
    setPointSizeType,
    minLimit,
    maxLimit
}) => {
    const { state: pointCloudState } = React.useContext(PointCloudContext)
    const { viewer } = pointCloudState.pointcloud


    React.useEffect(() => {
        if (!viewer) return

        const pointcloud = viewer.scene.pointclouds[0];
        if (!pointcloud) return // viewer can exist before any cloud is loaded

        pointcloud.material.minSize = minNodeSize[0];

    }, [viewer, minNodeSize])

    React.useEffect(() => {
        if (!viewer) return

        const pointcloud = viewer.scene.pointclouds[0];
        if (!pointcloud) return

        pointcloud.material.maxSize = maxNodeSize[0];

    }, [viewer, maxNodeSize])

    React.useEffect(() => {
        if (!viewer) return

        const pointcloud = viewer.scene.pointclouds[0];
        if (!pointcloud) return

        pointcloud.material.pointSizeType = pointSizeType;

    }, [viewer, pointSizeType])

    const handleMinNodeSizeChange = (value: number[]) => {
        // Ensure min doesn't exceed max
        if (value[0] <= maxNodeSize[0]) {
            setMinNodeSize(value)
        }
    }

    const handleMaxNodeSizeChange = (value: number[]) => {
        // Ensure max doesn't go below min
        if (value[0] >= minNodeSize[0]) {
            setMaxNodeSize(value)
        }
    }

    return (
       <div className="space-y-3">
          <Label className="text-sm font-medium">Node Size</Label>

          {/* Point Size Type Selection */}
          <div className="space-y-2">
            <span className="text-xs text-gray-600">Point Size Type</span>
            <div className="flex gap-2">
              <CustomButton
                active={pointSizeType === PointSizeType.FIXED}
                onClick={() => setPointSizeType(PointSizeType.FIXED)}
                disabled={!viewer}
                icon={<Pin size={14} />}
                label="Fixed"
              />
              <CustomButton
                active={pointSizeType === PointSizeType.ATTENUATED}
                onClick={() => setPointSizeType(PointSizeType.ATTENUATED)}
                disabled={!viewer}
                icon={<TrendingDown size={14} />}
                label="Attenuated"
              />
              <CustomButton
                active={pointSizeType === PointSizeType.ADAPTIVE}
                onClick={() => setPointSizeType(PointSizeType.ADAPTIVE)}
                disabled={!viewer}
                icon={<Zap size={14} />}
                label="Adaptive"
              />
            </div>
          </div>

          {/* Min Node Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Minimum</span>
              <span className="text-xs text-gray-500">{minNodeSize[0]}px</span>
            </div>
            <Slider
              value={minNodeSize}
              onValueChange={handleMinNodeSizeChange}
              min={minLimit}
              max={maxLimit}
              step={0.1}
              disabled={!viewer}
              className="w-full"
            />
          </div>

          {/* Max Node Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Maximum</span>
              <span className="text-xs text-gray-500">{maxNodeSize[0]}px</span>
            </div>
            <Slider
              value={maxNodeSize}
              onValueChange={handleMaxNodeSizeChange}
              min={minLimit}
              max={maxLimit}
              step={0.1}
              disabled={!viewer}
              className="w-full"
            />
          </div>
        </div>
    )
}

export default NodeSizeSelectionTool