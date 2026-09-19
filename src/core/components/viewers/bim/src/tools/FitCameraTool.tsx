"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies

// Utilities

// Shadcn components

// Icons
import * as LR from 'lucide-react'
import * as React from "react";

import { BimContext } from '../../../../../store/BIM/context'
import { Button } from '../../../../ui/Button'
import { FitCamera } from '../FitCamera'
import { isModelIdMapEmpty } from '../lib/bimTree'
import { BimSceneObjects } from '../SceneObjects'
import { BimSplats } from '../Splats'

import type { Tool } from '../../../../../types/tools'

interface FitCameraProps {
  tool: Tool
}

export const FitCameraTool: React.FC<FitCameraProps> = ({ tool }) => {
  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents, selection, sceneSelection } = bimState.bim

  const handleFitCamera = async () => {
    if (!bimComponents) return

    try {
      const fitCamera = bimComponents.get(FitCamera)
      if (!fitCamera) throw new Error('FitCamera component not found')

      if (sceneSelection?.kind === 'splat') {
        const box = bimComponents.get(BimSplats).boundsOf(sceneSelection.fileId)
        if (box) { await fitCamera.frameBox(box, true); return }
      }
      if (sceneSelection?.kind === 'object') {
        const root = bimComponents.get(BimSceneObjects).registry?.get(sceneSelection.fileId)?.root
        if (root) { await fitCamera.fitToSelection([root]); return }
      }

      if (selection && !isModelIdMapEmpty(selection)) {
        if (await fitCamera.fitToItems(selection)) return
      }
      await fitCamera.fit()
    }
    catch (error) {
      console.error('Error fitting camera:', error)
    }
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      className="flex justify-center items-center h-9 w-9 pointer-events-auto"
      onClick={() => void handleFitCamera()}
      title={tool.title}
    >
      <LR.Fullscreen />
    </Button>
  )
}