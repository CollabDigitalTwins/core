'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { MapGeoJSONFeature } from 'maplibre-gl'

// Dependencies
import * as React from 'react'

import { Popover, PopoverTrigger } from '../../../../ui/Popover'

import DatabaseBuildingPopover from './src/DatabaseBuildingPopover'
import NonDatabaseBuildingPopover from './src/NonDatabaseBuildingPopover'
import OpenDataFeaturePopover from './src/OpenDataFeaturePopover'
import PopoverSkeleton from './src/PopoverSkeleton'

type Props = {
  feature: MapGeoJSONFeature | null
  onCloseAction: () => void
}

type PopoverType
  = | 'database-building'
    | 'non-database-building'
    | 'open-data'
    | 'loading'

export default function MapFeaturePopoverMenu({ feature, onCloseAction }: Props) {
  const [open, setOpen] = React.useState(true)
  const [popoverType, setPopoverType] = React.useState<PopoverType>('loading')

  const osmId: number = Number(feature?.id || feature?.properties?.osmId || feature?.properties?.osm_id) || null
  const dbId: number = Number(feature?.properties?.dbId) || null

  React.useEffect(() => {
    if (dbId) {
      setPopoverType('database-building')
    }
    else if (osmId) {
      setPopoverType('non-database-building')
    }
    else {
      setPopoverType('open-data')
    }
  }, [feature])

  React.useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        if (onCloseAction)
          onCloseAction()
      }
    }
    window.addEventListener('keydown', handleEsc)

    // Add map pan/zoom handler to close popover
    const handleMapInteraction = () => {
      setOpen(false)
      if (onCloseAction)
        onCloseAction()
    }
    const mapElement = document.querySelector('.maplibregl-canvas')
    if (mapElement) {
      mapElement.addEventListener('wheel', handleMapInteraction)
      mapElement.addEventListener('click', handleMapInteraction)
    }

    return () => {
      window.removeEventListener('keydown', handleEsc)
      if (mapElement) {
        mapElement.removeEventListener('wheel', handleMapInteraction)
        mapElement.removeEventListener('click', handleMapInteraction)
      }
    }
  }, [onCloseAction])

  const handleClose = () => {
    setOpen(false)
    if (onCloseAction)
      onCloseAction()
  }

  const renderPopoverContent = () => {
    switch (popoverType) {
      case 'loading':
        return <PopoverSkeleton />
      case 'database-building': {
        return (
          <DatabaseBuildingPopover
            feature={feature}
            isOpen={open}
            onCloseAction={handleClose}
          />
        )
      }
      case 'non-database-building':
        return (
          <NonDatabaseBuildingPopover
            feature={feature}
            isOpen={open}
            onCloseAction={handleClose}
          />
        )
      case 'open-data':
      default:
        return (
          <OpenDataFeaturePopover
            feature={feature}
            isOpen={open}
            onCloseAction={handleClose}
          />
        )
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      defaultOpen={open}
    >
      <PopoverTrigger asChild>
        <div />
      </PopoverTrigger>
      {open && renderPopoverContent()}
    </Popover>
  )
}
