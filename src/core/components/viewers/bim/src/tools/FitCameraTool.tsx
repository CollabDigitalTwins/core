"use client"

// Dependencies
import * as React from "react";

// Utilities
import { Tool } from '../../../../../types/tools'

// Shadcn components
import { Button } from '../../../../ui/Button'

// Icons
import * as LR from 'lucide-react'
import { BimContext } from '../../../../../store/BIM/context'
import { FitCamera } from '../FitCamera'

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