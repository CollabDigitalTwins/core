"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Icons
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import React from 'react'

// Dependencies


import { Button, ExportData, ColorCircle } from '../../../../../components/ui/'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../../../components/ui/Dialog'
import { MapContext, useBuildingsContext } from '../../../../../store'
import { useBuildingHeaders, useSiteHeaders } from '../../../Data/utils/Headers'
// Shadcn components

// Custom Components
import { fitBuildingsBounds } from '../../utils/fitBuildingsBounds'
import { stringToColour } from '../../utils/stringToColour'

import AddItem from './AddItem'
import {
  DescriptionListItem,
} from './description-list'

import type { CompareItem } from '../../../../../store';
import type { Building, Site } from '../../../../../types/dbTypes'

type CompareDialogProps = {
  toggleOpen: () => void
  compareItems: CompareItem[]
  setCompareItems: (items: CompareItem[]) => void
  handleAddBuilding: (building: Building) => void
  handleAddSite?: (site: Site) => void
}

export default function CompareDialog({ toggleOpen, compareItems, setCompareItems, handleAddBuilding, handleAddSite }: CompareDialogProps) {
  // Translation
  const t = useTranslations('CompareDialog')

  const { comparing, setComparing } = useBuildingsContext()
  const { state: mapState } = React.useContext(MapContext)
  const { map } = mapState.map
  const [dialogOpen, setDialogOpen] = React.useState(false)

  // Determine if we're comparing buildings or sites
  const isComparingSites = compareItems.some(item =>
    item.siteName !== undefined || item.siteAddress !== undefined,
  )

  // Choose the appropriate headers
  const headers = isComparingSites ? useSiteHeaders() : useBuildingHeaders()
  const excludedKeys = new Set([
    'id',
    'buildingId',
    'siteId',
    'organizationIds',
    'buildingOwnerIds',
    'buildingName', // Shown in header
    'buildingAddress', // Shown in header
    'siteName', // Shown in header
    'siteAddress', // Shown in header
  ])

  const removeBuilding = (index: number) => {
    const updatedBuildings = [...compareItems]
    updatedBuildings.splice(index, 1)
    setCompareItems(updatedBuildings)
  }

  const onCloseDialog = () => {
    setDialogOpen(false)
    // Call the parent's toggleOpen to reset comparing state and clear items
    toggleOpen()
  }

 const onCompare = () => {
    setDialogOpen(true)
    if (map) {
      // Filter items that have building coordinates
      const buildingsWithCoords = compareItems.filter(item =>
        item.buildingLongitude != null && item.buildingLatitude != null,
      )
      if (buildingsWithCoords.length > 0) {
        const buildings: Building[] = buildingsWithCoords.map(item => ({
          ...item,
          id: parseInt(item.id),
          buildingEmail: item.buildingEmail || '',
          buildingPhoneNumber: item.buildingPhoneNumber || '',
          buildingAddress: item.buildingAddress || '',
          buildingStreetNumber: item.buildingStreetNumber || '',
          buildingStreetName: item.buildingStreetName || '',
          buildingStreetType: item.buildingStreetType || '',
          buildingStreetDirection: item.buildingStreetDirection || '',
        } as Building))
        fitBuildingsBounds(buildings, map)
      }
    }
  }

  // Render properties organized by header sections
  const renderComparisonContent = () => {
    if (compareItems.length === 0)
      return null

    return headers.map((section, sectionIndex) => (
      <div key={sectionIndex} className="mb-6">
        {/* Section Title */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-0 border-b border-border">
          <div className="col-span-12 py-3 px-2">
            <h3 className="text-lg font-semibold text-foreground">{section.title}</h3>
          </div>
        </div>

        {/* Properties in this section */}
        {section.subsections.map((subsection, subsectionIndex) =>
          subsection.fields
            .filter(field => !excludedKeys.has(field.property))
            .map((field, fieldIndex) => (
              <DescriptionListItem key={`${subsectionIndex}-${fieldIndex}`} label={field.label as string}>
                <div className="grid grid-cols-1 grid-flow-col auto-cols-fr">
                  {compareItems.map((item, itemIndex) => (
                    <div key={itemIndex} className={`py-3 px-2 relative pointer-events-none ${itemIndex === 1 ? 'md:bg-[#f9f9fa]' : ''}`}>
                      <div
                        className={`pointer-events-none ${itemIndex === 1 ? `bg-[#f9f9fa] md:bg-transparent absolute h-full w-full top-0 left-0 origin-bottom scale-y-[2] -z-10` : ''}`}
                      >
                      </div>
                      <span className="text-sm text-muted-foreground break-words">
                        {(() => {
                          const value = item[field.property]
                          if (value === null
                            || value === undefined
                            || value === 'null'
                            || value === ''
                            || (Array.isArray(value) && value.length === 0)) {
                            return <span className="italic">---</span>
                          }

                          // Handle arrays by joining with commas
                          if (Array.isArray(value)) {
                            return value.join(', ')
                          }

                          if (value === true) return 'Yes'
                          if (value === false) return 'No'

                          // Handle other objects
                          return typeof value === 'object'
                            ? JSON.stringify(value)
                            : String(value)
                        })()}
                      </span>
                    </div>
                  ))}
                </div>
              </DescriptionListItem>
            )),
        )}
      </div>
    ))
  }

  return (
    <>
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          // When dialog closes, reset everything
          if (!open) {
            toggleOpen()
          }
        }}
      >
        <DialogTrigger asChild>
          <Button onClick={onCompare}>
            {t('compareNow')}
          </Button>
        </DialogTrigger>
        <DialogContent className="w-screen h-screen max-w-screen sm:h-auto sm:max-w-[95vw] xl:max-w-[1200px] pb-0" closeClass="hidden">
          <DialogHeader className="flex flex-row justify-between items-center">
            {/* Title & Description */}
            <div className="flex flex-col gap-1.5">
              <DialogTitle>{t('compare')}</DialogTitle>
              <DialogDescription>
                {t('description1')}
                {' '}
                {isComparingSites ? t('sites') : t('buildings')}
                {' '}
                {t('description2')}
              </DialogDescription>
            </div>
            {/* Export & Add buttons */}
            <div className="flex flex-row gap-2.5 h-full !m-0">
              <ExportData
                data={
                  isComparingSites
                    ? compareItems.map(item => ({
                        ...item,
                        id: Number(item.id),
                      })) as Site[]
                    : compareItems.map(item => ({
                        ...item,
                        id: Number(item.id),
                      })) as Building[]
                }
                variant="secondary"
                type={isComparingSites ? "site" : "building"}
              />
              {/* Add buildings */}
              {compareItems.length < 3 && (
                <AddItem
                  handleAddBuilding={handleAddBuilding}
                  handleAddSite={handleAddSite}
                  isComparingSites={isComparingSites}
                  icon={<LR.GitCompare />}
                  variant="secondary"
                />
              )}

              <DialogClose onClick={onCloseDialog} asChild>
                <Button
                  variant="ghost"
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary"
                >
                  <LR.X className="!h-6 !w-6" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>

          {/* Compare Layout */}
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="flex flex-col w-full">
              {/* Building headers row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-0 border-y border-border sticky top-0 z-10 bg-background">
                <div className="col-span-4 py-0 px-2 text-sm font-semibold text-foreground sticky left-0 bg-background">
                  {/* Empty space for property labels column */}
                </div>
                <div className="col-span-8 p-0">
                  <div className="grid grid-cols-1 grid-flow-col auto-cols-fr h-full">
                    {compareItems.map((item, index) => (
                      <div key={index} className={`flex flex-row justify-between py-3 px-2 ${index === 1 ? 'bg-[#f9f9fa]' : 'bg-background'}`}>
                        {/* text */}
                        <div className="flex-1">
                          <h3 className="text-xl text-card-foreground break-words  top-4">
                            <ColorCircle color={stringToColour(
                              item.buildingName || item.buildingAddress
                              || item.siteName || item.siteAddress || t('unknown'),
                            )}
                            />
                            {item.buildingName || item.buildingAddress
                              || item.siteName || item.siteAddress || t('unknown')}
                          </h3>
                          <p className="text-xs text-muted-foreground break-words">
                            {(item.buildingName && item.buildingAddress)
                              || (item.siteName && item.siteAddress)}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent ml-2"
                          onClick={() => removeBuilding(index)}
                        >
                          <LR.CircleMinus className="" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Render comparison content organized by sections */}
              {renderComparisonContent()}
            </div>
          </div>

        </DialogContent>
      </Dialog>
    </>
  )
}
