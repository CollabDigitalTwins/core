"use client"

// Dependencies
import * as React from "react";
import { useTranslations } from 'next-intl'
import * as OBC from '@thatopen/components'

// Utilities
import { ToolsContext } from '../../../../../../../../store'
import { Tool } from '../../../../../../../../types/tools'

// Shadcn components
import {
  DropdownMenuItem,
} from '../../../../../../../ui/DropdownMenu'

import { BimContext } from '../../../../../../../../store/BIM/context'
import { ToolbarSubmenu } from '../../../../../../../ToolbarSubmenu'
import { CameraProjection } from '../../../../CameraProjection'
import { CurrentCamera } from '../../../../CurrentCamera'
import { FitCamera } from '../../../../FitCamera'
import { LogOut } from 'lucide-react'
import type { Plan } from '../../../../../../../../types/bim'
import { ViewsList } from '../../../../ViewsList'

interface FloorplanLevelsProps {
  tool: Tool
}

// STYLE FLOORPLAN:
// New tutorials on That Open Docs: https://docs.thatopen.com/Tutorials/Fragments/Fragments/FragmentsModels/BuildingConfigurator
// Cutting style  https://docs.thatopen.com/Tutorials/Components/Front/ClipStyler
// White materials https://docs.thatopen.com/Tutorials/Components/Front/PostproductionRenderer


export const FloorplanLevels: React.FC<FloorplanLevelsProps> = ({ tool }) => {
  // Translation
  const t = useTranslations('FloorplanLevels')

  const { dispatch: toolsDispatch } = React.useContext(ToolsContext)
  const { state: bimState } = React.useContext(BimContext)

  const [active, setActive] = React.useState(false)
  const [levels, setLevels] = React.useState<Plan[]>([])

  // Store original camera controls properties
  const [originalControls, setOriginalControls] = React.useState<{
    minAzimuthAngle: number
    maxAzimuthAngle: number
    minPolarAngle: number
    maxPolarAngle: number
    mouseButtons: any
  } | null>(null)

  const { bimComponents } = bimState.bim

  // Get the FloorplanList component and its floorplan views
  const floorplanListComponent = bimComponents?.get(ViewsList)
  const floorplanViews = floorplanListComponent?.levelViews || []
  
  console.log('Retrieved floorplan views:', floorplanViews)

  // Effect to extract levels from floorplan views created by OBC.Views
  React.useEffect(() => {
    if (!floorplanViews || floorplanViews.length === 0) return

    const extractedLevels: Plan[] = []

    floorplanViews.forEach((view, index) => {
      // Extract level information from the view
      // The view ID often contains the storey name
      const viewId = view.id || `Level ${index + 1}`
      
      // Get the elevation from the view's camera position
      const elevation = view.camera?.three?.position?.y || 0
      
      const level: Plan = {
        Name: viewId,
        Elevation: elevation * 1000 // Convert to mm if needed
      }

      // Check for duplicates
      const isDuplicate = extractedLevels.some(existingLevel =>
        existingLevel.Name === level.Name || Math.abs(existingLevel.Elevation - level.Elevation) < 0.1
      )

      if (!isDuplicate) {
        extractedLevels.push(level)
      }
    })

    // Sort levels by elevation (lowest to highest)
    extractedLevels.sort((a, b) => a.Elevation - b.Elevation)
    
    setLevels(extractedLevels)
    console.log('Extracted levels from floorplan views:', extractedLevels)
  }, [floorplanViews])

  const floorplanPlaneHeight = 0

  const [isFirstTime, setIsFirstTime] = React.useState(true)

  const onLevelClicked = (level: Plan) => {
    console.log('Level clicked:', level)
    
    // Try to find the corresponding view for this level
    const correspondingView = floorplanViews.find(view => 
      view.id === level.Name || 
      view.id.includes(level.Name) ||
      Math.abs((view.camera?.three?.position?.y || 0) * 1000 - level.Elevation) < 100 // Within 10cm
    )
    
    if (correspondingView) {
      // Use the That Open Views component to open the floor plan
      const views = bimComponents?.get(OBC.Views)
      if (views) {
        views.open(correspondingView.id)
        console.log('Opened floor plan view:', correspondingView.id)
      }
    } else {
      // Fallback to manual camera positioning
      const camera = bimComponents?.get(CurrentCamera)?.camera
      const fitCamera = bimComponents?.get(FitCamera)
      if (fitCamera) fitCamera.fit()
      
      if (camera && level.Elevation !== undefined) {
        const { controls } = camera

        // Save original controls properties before making changes
        if (!originalControls) {
          setOriginalControls({
            minAzimuthAngle: controls.minAzimuthAngle,
            maxAzimuthAngle: controls.maxAzimuthAngle,
            minPolarAngle: controls.minPolarAngle,
            maxPolarAngle: controls.maxPolarAngle,
            mouseButtons: { ...controls.mouseButtons },
          })
        }

        // Set floor plan view constraints
        controls.minAzimuthAngle = -Infinity
        controls.maxAzimuthAngle = Infinity
        controls.minPolarAngle = 0
        controls.maxPolarAngle = 0

        controls.setPosition(0, level.Elevation / 1000 + floorplanPlaneHeight, 0)
        controls.setTarget(0, level.Elevation / 1000, 0)

        controls.mouseButtons.left = 2
        controls.mouseButtons.middle = 1
        controls.mouseButtons.right = 0
      }
    }

    if (!active) {
      setActive(true)
    }
    toolsDispatch({ type: 'CLEAR-TOOLS' })

    const cameraProjection = bimComponents?.get(CameraProjection)
    if (cameraProjection && isFirstTime) {
      cameraProjection.setOrthographic()
      setTimeout(() => cameraProjection.setPerspective(), 1)
      setIsFirstTime(false)
    }
    setTimeout(() => cameraProjection.setOrthographic(), 1)
  }

  const onExitPlanView = () => {
    console.log('Exiting plan view')
    setActive(false)
    toolsDispatch({ type: 'CLEAR-TOOLS' })

    // Close any open views using the That Open Views component
    const views = bimComponents?.get(OBC.Views)
    if (views) {
      views.close()
    }

    const camera = bimComponents?.get(CurrentCamera)?.camera
    if (camera && originalControls) {
      const { controls } = camera

      // Restore original controls properties
      controls.minAzimuthAngle = originalControls.minAzimuthAngle
      controls.maxAzimuthAngle = originalControls.maxAzimuthAngle
      controls.minPolarAngle = originalControls.minPolarAngle
      controls.maxPolarAngle = originalControls.maxPolarAngle
      controls.mouseButtons = { ...originalControls.mouseButtons }

      // Important: call update to apply the changes
      controls.update(0)
    }

    // Clear saved state AFTER restoring
    setOriginalControls(null)

    // Reset isFirstTime to allow proper orthographic setup next time
    setIsFirstTime(true)

    const cameraProjection = bimComponents?.get(CameraProjection)
    if (cameraProjection) {
      cameraProjection.setPerspective()
    }
    const fitCamera = bimComponents?.get(FitCamera)
    if (fitCamera) fitCamera.fit()
  }

  return (
    <>
      {levels.length > 0 && (
        <ToolbarSubmenu tool={tool}>
          {active && (
            <DropdownMenuItem onClick={() => onExitPlanView()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('exitButton')}</span>
            </DropdownMenuItem>
          )}
          <div className="max-h-[30vh] overflow-y-auto">
            {levels.map((level: Plan, index) => (
              <DropdownMenuItem key={`${level.Name}-${index}`} onClick={() => onLevelClicked(level)}>
                <span>{level.Name}</span>
              </DropdownMenuItem>
            ))}
          </div>
        </ToolbarSubmenu>
      )}
    </>
  )
}