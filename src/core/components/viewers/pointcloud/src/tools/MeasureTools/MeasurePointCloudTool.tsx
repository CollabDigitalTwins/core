"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies

// Utilities

// Shadcn components

// Icons
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from "react";

import { ToolsContext } from '../../../../../../store'
import { PointCloudContext } from '../../../../../../store'
import { PointCloudTools } from '../../../../../../store/PointCloud/reducer'
import { ToolbarToolType } from '../../../../../../types/tools'
import { ToolbarSubmenu } from '../../../../../ToolbarSubmenu'
import { Button } from '../../../../../ui/Button'
import { DropdownMenuItem} from '../../../../../ui/DropdownMenu'

import AngleMeasurement from './AngleMeasurement'
import AreaMeasurement from './AreaMeasurement'
import LineMeasurement from './LineMeasurement'

import type { Tool} from '../../../../../../types/tools';

interface GenericTool {
  tool: Tool
}

export const MeasurePointCloudTool: React.FC<GenericTool> = ({ tool }) => {
  // Translation
  const t = useTranslations('MeasurePointCloudTool')
  const [active, setActive] = React.useState(false)

  const {state: pointCloudStates, dispatch: pointCloudDispatch} = React.useContext(PointCloudContext)
  const {activeTool, viewer} = pointCloudStates.pointcloud;

  const [currentMeasurements, setCurrentMeasurements] = React.useState([]);

  const setActiveTool = (nextActiveTool: PointCloudTools) => {
    viewer.setLengthUnit('in')
    pointCloudDispatch({
      type: "SET_ACTIVE_TOOL",
      payload:{
        activeTool: nextActiveTool
      }
    })
  }

  const cancelMeasurement = () => {
    setActiveTool(PointCloudTools.NONE)
  }

  const removeAllMeasurements = () => {
    if (!viewer) return

    const measurements = viewer.scene.measurements;
    console.log("There are ", measurements.length, " measurements to remove")

    for (let i = measurements.length - 1; i >= 0; i--) {
      const measurement = measurements[i];
      viewer.scene.removeMeasurement(measurement);
    }
  }

  const handleKeyDownPress = React.useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      cancelMeasurement()
    }
  }, [])

  React.useEffect(()=>{
    if (activeTool !== PointCloudTools.NONE){
      window.addEventListener("keydown", handleKeyDownPress)
    }
    else {
      window.removeEventListener("keydown", handleKeyDownPress)
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDownPress)
    }
  }, [activeTool])

  return (
    <div>
        <ToolbarSubmenu tool={tool} >
          <DropdownMenuItem onClick={() => {setActiveTool(PointCloudTools.LINE_MEASUREMENT)}}>
            <LR.Ruler />
            <span>{t('line')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {setActiveTool(PointCloudTools.AREA_MEASUREMENT)}}>
            <LR.SquareDashed />

            <span>{t('area')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {setActiveTool(PointCloudTools.ANGLE_MEASUREMENT)}}>
            <LR.TriangleDashed />
            <span>Angle Measurement</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            removeAllMeasurements();
            setActiveTool(PointCloudTools.NONE)
            }}>
            <LR.X />
            <span>{t('clear')}</span>
          </DropdownMenuItem>
        </ToolbarSubmenu>

        {/* Place outside of DropdownMenuItem to avoid unmount */}
        <LineMeasurement active={activeTool === PointCloudTools.LINE_MEASUREMENT} currentMeasurements={currentMeasurements}/>
        <AreaMeasurement active={activeTool === PointCloudTools.AREA_MEASUREMENT} currentMeasurements={currentMeasurements}/>
        <AngleMeasurement active={activeTool === PointCloudTools.ANGLE_MEASUREMENT} currentMeasurements={currentMeasurements}/>
    </div>
  )
}