'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as React from 'react'
import { useTranslations } from 'next-intl'

// Shadcn Components
import { Button } from '../../../../../ui/Button'
import { PopoverContent } from '../../../../../ui/Popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../../ui/Table'

// Icons
import * as LR from 'lucide-react'

// Types / Utilities
import type { MapGeoJSONFeature } from 'maplibre-gl'
import ColorCircle from '../../../../../ui/ColorCircle'
import { DatasetsContext } from '../../../../../../store/Datasets/context'
import { stringToColour } from '../../../utils/stringToColour'

interface OpenDataFeaturePopoverProps {
  feature: MapGeoJSONFeature
  isOpen: boolean
  onCloseAction: () => void
}

export default function OpenDataFeaturePopover({
  feature,
  isOpen,
  onCloseAction,
}: OpenDataFeaturePopoverProps) {
  // Translation
  const t = useTranslations('OpenDataFeaturePopover')

  const {state: datasetsState} = React.useContext(DatasetsContext)
  const {addedDatasets} = datasetsState.datasets

  const featureProps = feature?.properties || {}
  // Filter out properties that are null, undefined, empty strings, or coordinate-related
  const validProperties = Object.entries(featureProps)
    .filter(([key, value]) => {
      // Check for null, undefined, or empty string values
      const lowValue = String(value).toLowerCase()
      if (
        value === null
        || value === undefined
        || value === ''
        || lowValue === 'null'
        || lowValue === 'undefined'
        || lowValue === 'none'
      ) {
        return false
      }

      // Filter out coordinate-related properties
      const lowerKey = key.toLowerCase()
      const excludingKeys = [
        'globalid',
        'latitude',
        'lat',
        'longitude',
        'lng',
        'lon',
        'coordinates',
        'coordina',
        'x',
        'y',
        'z',
        'geometry',
        'cluster',
        'cluster_id',
        'point_count_abbreviated',
        'datasetName',
        'datasetColor',
      ]
      return !excludingKeys.includes(lowerKey)
    })
    .sort(([keyA], [keyB]) => {
      const aHasName = keyA.toLowerCase().includes('name')
      const bHasName = keyB.toLowerCase().includes('name')
      if (aHasName && !bHasName) return -1
      if (!aHasName && bHasName) return 1
      return 0
    })

  // Function to format property names (convert snake_case to readable format)
  const formatPropertyName = (key: string): string => {
    return key
      .replaceAll('_', ' ')
      .replaceAll(/\b\w/g, l => l.toUpperCase())
  }

  // Function to format property values
  const formatPropertyValue = (value: any, key?: string): string => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    if (typeof value === 'number') {
      // Don't add commas for year-like fields
      if (key && key.toLowerCase().includes('year')) {
        return value.toString()
      }
      return value.toLocaleString()
    }
    if (typeof value === 'string') {
      // Handle URLs
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return value
      }
      return value
    }
    return String(value)
  }

  // Function to check if value is a URL
  const isUrl = (value: string): boolean => {
    return value.startsWith('http://') || value.startsWith('https://')
  }

  console.log('Feature Properties:', featureProps)

  const datasetName = (featureProps.datasetName ? featureProps.datasetName.replaceAll('_', ' ') : t('unknownDataset'))
  const dataset = addedDatasets.find(d => d.name === featureProps.datasetName)
  const datasetColor = dataset ? dataset.layerColor.color : stringToColour(datasetName)

  return (
    <PopoverContent className="w-80 -m-1" side="top">
      <div className="grid gap-4">
        <Button
          onClick={onCloseAction}
          variant="ghost"
          className="absolute top-1 right-2 p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <LR.X className="w-4 h-4" />
        </Button>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <LR.Database className="w-4 h-4" />
            <h4 className="font-medium leading-none">{t('propertiesHeader')}</h4>
          </div>
          {/* Circle with the dataset color */}
          <div className="flex items-center gap-2 pl-[2px]">
            <ColorCircle color={datasetColor} size={14} />
            <p className="text-xs text-muted-foreground">
              {datasetName}
            </p>
          </div>
        </div>

        {validProperties.length > 0
          ? (
              <div className="max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3 text-xs">{t('propertyTableHead')}</TableHead>
                      <TableHead className="text-xs">{t('valueTableHead')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validProperties.map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell className="font-medium text-xs py-2">
                          {formatPropertyName(key)}
                        </TableCell>
                        <TableCell className="text-xs py-2">
                          {isUrl(String(value))
                            ? (
                                <a
                                  href={String(value)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline break-all"
                                >
                                  {formatPropertyValue(value, key)}
                                </a>
                              )
                            : (
                                <span className="break-words">
                                  {formatPropertyValue(value, key)}
                                </span>
                              )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          : (
              <div className="text-center py-4">
                <LR.FileX className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t('noPropertyAvail')}
                </p>
              </div>
            )}

        {validProperties.length > 10 && (
          <div className="text-xs text-muted-foreground text-center">
            {t('showing')}
            {' '}
            {validProperties.length}
            {' '}
            {t('properties')}
          </div>
        )}
      </div>
    </PopoverContent>
  )
}
