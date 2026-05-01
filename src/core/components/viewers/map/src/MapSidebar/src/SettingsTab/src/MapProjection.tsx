'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import * as LR from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '../../../../../../../ui/Tabs'
import { MapContext } from '../../../../../../../../store'

type MapProjectionType = 'globe' | 'mercator'

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

  React.useEffect(() => {
    if (!map || !map.loaded()) return

    setMapProjection(getCurrentProjection())
  }, [map, getCurrentProjection])

  const handleMapProjection = () => {
    if (!map) return

    const currentProjection = getCurrentProjection()
    const nextProjection = currentProjection !== 'globe' ? 'globe' : 'mercator'

    map.setProjection({ type: nextProjection })
    setMapProjection(nextProjection)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{tMap('mapProjection')}</label>
      <Tabs value={mapProjection} onValueChange={handleMapProjection} variant="switch">
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
