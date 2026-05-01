'use client'

import * as React from "react";
import { useTranslations } from 'next-intl'
import { Globe, Grid3X3 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '../../../../../../../ui/Tabs'
import { BimContext } from '../../../../../../../../store/BIM/context'
import * as OBC from '@thatopen/components'
import { ViewportGizmo } from '../../../../ViewportGizmo'

export function ToggleProjection() {
  // Translation
  const t = useTranslations('ToggleProjection')

  const [cameraMode, setCameraMode] = React.useState('Perspective')
  const { state: bimState } = React.useContext(BimContext)
  const { world, bimComponents } = bimState.bim

  type Projections = 'Orthographic' | 'Perspective'
  const [setCameraProjectionLabel] = React.useState<Projections>('Orthographic')

  // Sync camera mode with actual camera projection
  React.useEffect(() => {
    if (world?.camera instanceof OBC.OrthoPerspectiveCamera) {
      const currentProjection = world.camera.projection.current
      setCameraMode(currentProjection)
    }
  }, [world?.camera])

  const handleCameraModeChange = (mode: string) => {
    if (!(bimComponents && world && world.camera && world.camera instanceof OBC.OrthoPerspectiveCamera)) return

    const viewportGizmo = bimComponents.get(ViewportGizmo)
    if (viewportGizmo) viewportGizmo.enabled = (mode !== 'Orthographic')

    try {
      const currentProjection = world.camera.projection.current

      // Only toggle if the requested mode is different from current
      if (mode !== currentProjection) {
        world.camera.projection.toggle()
      }

      setCameraMode(mode)
    }
    catch (error) {
      console.error('Error toggling camera projection:', error)
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t('perspectiveLabel')}</label>
      <Tabs value={cameraMode} onValueChange={handleCameraModeChange} variant="switch">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="Perspective">
            <Globe className="w-4 h-4 mr-2" />
            {t('perspective')}
          </TabsTrigger>
          <TabsTrigger value="Orthographic">
            <Grid3X3 className="w-4 h-4 mr-2" />
            {t('orthographic')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}