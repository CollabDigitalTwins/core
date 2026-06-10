'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import * as LR from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '../../../../../../../ui/Tabs'
import { MapContext } from '../../../../../../../../store'

type MapProjectionType = 'globe' | 'mercator'

const MAX_GLOBE_ZOOM = 5

export function MapProjection() {
  const tMap = useTranslations('MapCustomization')
  const { state: mapState } = React.useContext(MapContext)
  const { map } = mapState.map
  const [mapProjection, setMapProjection] = React.useState<MapProjectionType>('globe')

  const getCurrentProjection = React.useCallback((): MapProjectionType => {
    if (!map) return 'globe'

    const projection = map.getProjection()

    if (typeof projection === 'string') {
      return projection === 'globe' ? 'globe' : 'mercator'
    }

    const projectionType =
      (projection as { type?: string; name?: string })?.type ??
      (projection as { type?: string; name?: string })?.name

    return projectionType === 'globe' ? 'globe' : 'mercator'
  }, [map])

  // Display-only sync. The zoom-based enforcement (forcing mercator past
  // MAX_GLOBE_ZOOM) now lives in MapViewer so it runs whether or not this
  // settings panel is mounted; here we just mirror the map's current projection
  // into the toggle UI.
  const syncProjectionDisplay = React.useCallback(() => {
    if (!map) return

    setMapProjection(getCurrentProjection())
  }, [getCurrentProjection, map])

  React.useEffect(() => {
    if (!map) return

    syncProjectionDisplay()

    map.on('zoom', syncProjectionDisplay)

    return () => {
      map.off('zoom', syncProjectionDisplay)
    }
  }, [map, syncProjectionDisplay])

  const handleMapProjection = (value: MapProjectionType) => {
    if (!map) return

    const forcedProjection = map.getZoom() > MAX_GLOBE_ZOOM ? 'mercator' : value

    if (getCurrentProjection() !== forcedProjection) {
      map.setProjection({ type: forcedProjection })
    }

    setMapProjection(forcedProjection)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{tMap('mapProjection')}</label>
      <Tabs value={mapProjection} onValueChange={value => handleMapProjection(value as MapProjectionType)} variant="switch">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="globe">
            <LR.Globe className="w-4 h-4 mr-2" />
            {tMap('globe')}
          </TabsTrigger>
          <TabsTrigger value="mercator">
            <LR.Map className="w-4 h-4 mr-2" />
            {tMap('mercator')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
