'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import * as LR from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '../../../../../../../ui/Tabs'
import { AppConfigContext, MapContext } from '../../../../../../../../store'
import { TerrainLevel as TerrainLevelType } from '../../../../../../../../types/map'

export function TerrainLevel() {
  const tMap = useTranslations('MapCustomization')
  const { state: appConfigState } = React.useContext(AppConfigContext)
  const { dispatch: mapDispatch, state: mapState } = React.useContext(MapContext)
  const { map, terrainLevel } = mapState.map
  const organizationCountry = (appConfigState.appConfig.organization?.country || '').toUpperCase()
  const isCanadaOrg = organizationCountry === 'CA'

  React.useEffect(() => {
    if (!isCanadaOrg && terrainLevel === 'high') {
      mapDispatch({ type: 'UPDATE_TERRAIN_LEVEL', payload: { terrainLevel: 'medium' } })
    }
  }, [isCanadaOrg, terrainLevel, mapDispatch])

  // Terrain control effect
  React.useEffect(() => {
    if (!map) return

    const updateTerrain = () => {
      if (terrainLevel === 'disabled') {
        // Disable terrain
        map.setTerrain(null)
      } else if (terrainLevel === 'medium') {
        // Check if terrain source already exists
        const terrainSourceExists = map.getSource('terrain-source')
        
        // Add terrain source if it doesn't exist
        if (!terrainSourceExists) {
          map.addSource('terrain-source', {
            type: 'raster-dem',
            url: 'https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=VwEIy1NDSOiSGeTOXMr1',
            tileSize: 256,
          })
        }
        // Enable terrain with medium exaggeration
        map.setTerrain({
          source: 'terrain-source',
          exaggeration: 1,
        })
      } else if (terrainLevel === 'high' && isCanadaOrg) {
        // Check if NRCan terrain sources already exist
        const nrcanTerrainExists = map.getSource('hrdem-terrain')
        const nrcanHillshadeExists = map.getSource('hrdem-hillshade')
        
        // Add NRCan terrain source if it doesn't exist
        if (!nrcanTerrainExists) {
          map.addSource('hrdem-terrain', {
            type: 'raster-dem',
            tiles: [
              '/api/nrcan-hr-dem?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=false&LAYERS=dtm&CRS=EPSG:3857&STYLES=&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}'
            ],
            tileSize: 256,
            maxzoom: 15,
            attribution: 'Contains information licensed under the Open Government Licence – Canada',
          })
        }
        
        // Add NRCan hillshade source and layer if they don't exist
        if (!nrcanHillshadeExists) {
          map.addSource('hrdem-hillshade', {
            type: 'raster',
            tiles: [
              '/api/nrcan-hr-hillshade?request=GetCapabilities&service=WMS&version=1.3.0&layers=dsm-hillshade&legend_format=image&png&feature_info_type=text&xml'
            ],
            tileSize: 256,
            maxzoom: 15,
            attribution: 'Contains information licensed under the Open Government Licence – Canada',
          })
          
          // Add hillshade layer if it doesn't exist
          if (!map.getLayer('nrcan-hillshade')) {
            map.addLayer({
              id: 'nrcan-hillshade',
              type: 'raster',
              source: 'hrdem-hillshade',
              paint: {
                'raster-opacity': 0.15,
              },
            })
          }
        }
        
        // Enable high-resolution terrain with lower exaggeration
        map.setTerrain({
          source: 'hrdem-terrain',
          exaggeration: 0.0002,
        })
      }
    }

    // Wait for map to be loaded before updating terrain
    if (map.loaded()) {
      updateTerrain()
    } else {
      map.once('load', updateTerrain)
    }
  }, [map, terrainLevel, isCanadaOrg])

  const handleTerrainLevel = (value: TerrainLevelType) => {
    if (!isCanadaOrg && value === 'high') return

    mapDispatch({ type: 'UPDATE_TERRAIN_LEVEL', payload: { terrainLevel: value } })
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{tMap('terrain')}</label>
      <Tabs value={terrainLevel} onValueChange={handleTerrainLevel} variant="switch">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="disabled">
            <LR.ArrowDownToLine className="w-4 h-4 mr-2" />
            {tMap('disabled')}
          </TabsTrigger>
          <TabsTrigger value="medium">
            <LR.Mountain className="w-4 h-4 mr-2" />
            {tMap('medium')}
          </TabsTrigger>
          <TabsTrigger value="high" disabled={!isCanadaOrg}>
            <LR.MountainSnow className="w-4 h-4 mr-2" />
            {tMap('high')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
