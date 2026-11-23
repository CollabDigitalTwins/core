'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { MapContext } from '../../../../../../../../store'
import { ColorInput } from '../../../../../../../ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../../../ui/Select'
import { Tabs, TabsList, TabsTrigger } from '../../../../../../../ui/Tabs'
import { SettingsSection } from '../../../../../../../ui/ViewerSidebar/SettingsSection'
import { useOrganizationMapStyles } from '../../../../../utils/useOrganizationMapStyles'

import { BuildingVisibility } from './BuildingVisibility'
import { MapProjection } from './MapProjection'
import { TerrainLevel } from './TerrainLevel'



export function MapCustomization() {
  // Translation
  const tMeasurements = useTranslations('MeasurementSettings')
  const tSettings = useTranslations('SettingsTab')
  const tMap = useTranslations('MapCustomization')

  // Contexts
  const { dispatch: mapDispatch, state: mapState } = React.useContext(MapContext)
  const { dimensionsColour } = mapState.map
  const { styles: mapStylesArray, current: resolvedMapStyle } = useOrganizationMapStyles()

  const handleDimensionsColour = (value: string) => {
    mapDispatch({ type: 'UPDATE_DIMENSIONS_COLOUR', payload: { dimensionsColour: value } })
  }

  return (
    <>
      <SettingsSection icon={LR.Map} title={tSettings('mapStyle')} defaultOpen={true} tourAnchor="settings-map">
        <div className="space-y-6">
          <div className="space-y-2" data-tour="settings-map-style">
            <Select
              value={resolvedMapStyle.url}
              onValueChange={(value: string) => {
                const selectedStyle = mapStylesArray.find(style => style.url === value)
                if (selectedStyle) {
                  mapDispatch({ type: 'UPDATE_MAP_STYLE', payload: { mapStyle: selectedStyle } })
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mapStylesArray.map((mapStyle, index) => (
                  <SelectItem key={index} value={mapStyle.url}>
                    {mapStyle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TerrainLevel />
          <MapProjection />
          <BuildingVisibility />
        </div>
      </SettingsSection>

      <SettingsSection icon={LR.Ruler} title={tMeasurements('title')} tourAnchor="settings-measurements">
        <div className="space-y-2">
          <label className="text-sm font-medium">{tMeasurements('lineColour')}</label>
          <div className="p-2 border rounded-md bg-white">
            <ColorInput
              value={dimensionsColour}
              onInput={e => handleDimensionsColour(e.currentTarget.value)}
              defaultColor={dimensionsColour}
            />
          </div>
        </div>
      </SettingsSection>
    </>
  )
}
