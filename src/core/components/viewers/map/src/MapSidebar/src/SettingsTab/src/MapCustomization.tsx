'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { AppConfigContext, MapContext } from '../../../../../../../../store'
import { ColorInput } from '../../../../../../../ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../../../ui/Select'
import { Tabs, TabsList, TabsTrigger } from '../../../../../../../ui/Tabs'
import { SettingsSection } from '../../../../../../../ui/ViewerSidebar/SettingsSection'
import { buildMapStylesCatalog, resolveMapStyle } from '../../../../../utils/mapStyleCatalog'

import { MapProjection } from './MapProjection'
import { TerrainLevel } from './TerrainLevel'



export function MapCustomization() {
  // Translation
  const tMeasurements = useTranslations('MeasurementSettings')
  const tSettings = useTranslations('SettingsTab')
  const tMap = useTranslations('MapCustomization')

  // Contexts
  const { state: appConfigState } = React.useContext(AppConfigContext)
  const { dispatch: mapDispatch, state: mapState } = React.useContext(MapContext)
  const { dimensionsColour, mapStyle: currentMapStyle } = mapState.map

  const mapStylesArray = React.useMemo(
    () => buildMapStylesCatalog(appConfigState.appConfig.organization?.mapStyles),
    [appConfigState.appConfig.organization?.mapStyles],
  )

  const resolvedMapStyle = React.useMemo(
    () => resolveMapStyle(currentMapStyle, mapStylesArray),
    [currentMapStyle, mapStylesArray],
  )

  const handleDimensionsColour = (value: string) => {
    mapDispatch({ type: 'UPDATE_DIMENSIONS_COLOUR', payload: { dimensionsColour: value } })
  }

  return (
    <>
      <SettingsSection icon={LR.Map} title={tSettings('mapStyle')} defaultOpen={true}>
        <div className="space-y-6">
          <div className="space-y-2">
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
        </div>
      </SettingsSection>

      <SettingsSection icon={LR.Ruler} title={tMeasurements('title')}>
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
