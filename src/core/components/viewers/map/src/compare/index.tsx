"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Icons
import * as LR from 'lucide-react'
// Dependencies
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Button } from '../../../../../components/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../../../components/ui/Card'
import ColorCircle from '../../../../../components/ui/ColorCircle'
import { usePermissions } from '../../../../../store'

// Data


import { MapContext, useBuildingsContext } from '../../../../../store'
// Shadcn Components


// Custom Components
import { MarkerManager } from '../../utils/MarkerManager'
import { stringToColour } from '../../utils/stringToColour'

import AddBuildings from './AddItem'
import CompareDialog from './CompareDialog'

import type { Building } from '../../../../../types/dbTypes'
import type { Tool } from '../../../../../types/tools'

type CompareProps = {
  tool: Tool
  building?: Building
}

export default function Compare({ tool, building }: CompareProps) {
  // Translation
  const t = useTranslations('Compare')
  // Permissions
  const { ability } = usePermissions()

  const { state: mapState } = React.useContext(MapContext)
  const { map } = mapState.map

  const { compareItems, setCompareItems, comparing, setComparing } = useBuildingsContext()

  const [isOpen, setIsOpen] = React.useState(false)

  const toggleOpen = () => {
    setIsOpen(!isOpen)
  }

  const onCloseDialog = () => {
    setComparing(false)
  }

  const handleClearAll = () => {
    setComparing(false)
    setCompareItems([])
  }

  const markerManager = new MarkerManager()

  // This useEffect was causing issues with building marker click events, removing for now

  // Effect to handle building prop if provided
  React.useEffect(() => {

    if (!map) return;

    if (building && !compareItems.some(b => b.id === String(building.id))) {
      setCompareItems([...compareItems, { ...building, id: String(building.id) }]);

      if (!comparing) return
      markerManager.create(
        [building.buildingLongitude, building.buildingLatitude],
        map,
        {
          allowMultiple: true, layerColor: stringToColour(building.buildingName || building.buildingAddress)
        }
      );
    }

  }, [building, compareItems, map, comparing]);

  const handleAddBuilding = (building: Building) => {
    // Convert building to compareItem format with string ID
    const compareItem = { ...building, id: String(building.id) }
    setCompareItems([...compareItems, compareItem])
    markerManager.create(
      [building.buildingLongitude, building.buildingLatitude],
      map,
      {
        allowMultiple: true,
        layerColor: stringToColour(building.buildingName || building.buildingAddress),
      },
    )
  }

  const cardAnimationClasses = `pointer-events-auto fixed left-1/2 transform -translate-x-1/2 bottom-0 transition-all duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${isOpen ? '' : 'opacity-0 pointer-events-none'}`

  // Close dialog and reset compareItems on Escape key
  React.useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setComparing(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [setComparing])

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="flex justify-center items-center h-9 w-9 pointer-events-auto"
        onClick={toggleOpen}
        title={tool.title}
        disabled={!ability.can('read', 'Building')}
      >
        <LR.Columns3 />
      </Button>

      <Card className={`${cardAnimationClasses} z-20 w-[80vw] max-w-[900px]`} data-state={isOpen ? 'open' : 'closed'}>
        <CardHeader className="flex flex-row justify-between items-center py-0">
          <CardTitle>
            {t('compareBuildings')}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleOpen}
            className="opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
          >
            <span className="sr-only">{t('close')}</span>
            <LR.X size={18} />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex flex-row p-6 gap-8 items-center border-2 border-dashed border-[#E3E1E4] border-opacity-50 bg-[#E3E1E4] bg-opacity-10 rounded-xl">
            {/* Building cards */}
            <div className="flex flex-row gap-2 items-stretch justify-center min-h-20">

              {/* map over selected buildings and populate with building card */}
              {compareItems.map((item, index) => (
                <Card key={index} className="flex flex-col relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent h-6 w-6"
                    onClick={() => {
                      const updatedItems = [...compareItems]
                      updatedItems.splice(index, 1)
                      setCompareItems(updatedItems)
                    }}
                  >
                    <LR.CircleMinus className="h-4 w-4" />
                  </Button>
                  <CardHeader className="flex flex-col justify-center">
                    <div className="flex items-center mb-2">
                      <ColorCircle color={stringToColour(item.buildingName || item.buildingAddress || item.siteName || item.siteAddress)} />
                      <CardTitle>
                        {item.buildingName || item.buildingAddress || item.siteName || item.siteAddress}
                      </CardTitle>
                    </div>
                    <CardDescription>
                      {(item.buildingName && item.buildingAddress) || (item.siteName && item.siteAddress)}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}

              {/* Add building button */}
              {compareItems.length < 3 && (
                <Card className="flex flex-col">
                  <CardHeader className="text-muted-foreground flex-1 flex justify-center items-center p-0">
                    <AddBuildings handleAddBuilding={handleAddBuilding} className="w-full h-full rounded-xl" variant="ghost" />
                  </CardHeader>
                </Card>
              )}

            </div>

            {/* Compare Button */}
            <div className="flex flex-col gap-2">
              <CompareDialog
                toggleOpen={onCloseDialog}
                compareItems={compareItems}
                setCompareItems={setCompareItems}
                handleAddBuilding={handleAddBuilding}
              />
              <Button variant="outline" onClick={handleClearAll} disabled={compareItems.length === 0}>
                {t('clearAll')}
              </Button>
            </div>
          </div>
        </CardContent>

      </Card>
    </>
  )
}
