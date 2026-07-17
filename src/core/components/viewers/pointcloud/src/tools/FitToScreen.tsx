"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import { PointCloudContext } from '../../../../../store'
import { PointCloudTools } from '../../../../../store/PointCloud/reducer'

// Dependencies
import { useTranslations } from 'next-intl'

// Utilities
import { Tool, ToolbarToolType } from '../../../../../types/tools'

// Shadcn components
import { Button } from '../../../../ui/Button'

// Icons
import * as LR from 'lucide-react'


export const FitToScreen = ({ tool }) => {
  const {state: pointCloudState, dispatch: pointCloudDispatch} = React.useContext(PointCloudContext);
  const {viewer} = pointCloudState.pointcloud

  React.useEffect(() => {
    if (!viewer) return
  }, [viewer])

  const handleClick = () => {
    console.log("Handle click")
    if (!viewer) return
    viewer.fitToScreen()
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      className="flex justify-center items-center h-9 w-9 pointer-events-auto"
      onClick={handleClick}
      title={`${tool.title}`}
      disabled={tool.disabled}
    >
      <tool.icon />
    </Button>
  )
}

export default FitToScreen;