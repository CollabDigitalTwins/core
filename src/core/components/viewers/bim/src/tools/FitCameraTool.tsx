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

import type { Tool } from '../../../../../types/tools'

interface FitCameraProps {
  tool: Tool
}

export const FitCameraTool: React.FC<FitCameraProps> = ({ tool }) => {
  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents } = bimState.bim

  const handleFitCamera = async () => {
    if (!bimComponents) return

    try {
      const fitCamera = bimComponents.get(FitCamera)
      if (!fitCamera) throw new Error('FitCamera component not found')
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
      onClick={handleFitCamera}
      title={tool.title}
    >
      <LR.Fullscreen />
    </Button>
  )
}