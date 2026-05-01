'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '../../../../../../../ui/Button'
import * as LR from 'lucide-react'
import * as OBC from '@thatopen/components' 
import * as OBF from '@thatopen/components-front'
import { BimContext } from '../../../../../../../../store'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { ViewsList } from '../../../../ViewsList'
import { CameraProjection } from '../../../../CameraProjection'
import { FitCamera } from '../../../../FitCamera'

interface ElevationSectionProps {
  query?: string
}

export function ElevationSection({ query = '' }: ElevationSectionProps) {
  // Translation
  const t = useTranslations('ViewSection')

  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents } = bimState.bim

  const viewsListComponent = bimComponents?.get(ViewsList)
  const elevationViews = viewsListComponent?.elevationsViews || []

  const [activeView, setActiveView] = React.useState<string | null>(null)

  const [elevations, setElevations] = React.useState<string[]>([])

  const fragments = bimComponents?.get(OBC.FragmentsManager)
  const fitCamera = bimComponents?.get(FitCamera)

  React.useEffect(() => {
    if (elevationViews?.length === 0) return

    const elevationList: string[] = []

    // Iterate through all views
    elevationViews.map((view) => {
      const { id } = view
      elevationList.push(id)
    })

    setElevations(elevationList)
  }, [elevationViews])

  const handleGoToElevation = (elevation: string) => {
    const views = bimComponents?.get(OBC.Views)
    if (!views) return

    if (activeView === elevation) {
      handleExitElevation()
    } else {
      views.open(elevation)

      const renderer = views.world.renderer as OBF.PostproductionRenderer;
      renderer.postproduction.enabled = true;
      renderer.postproduction.style = 1;
      // fragments.core.update(true)
      // fitCamera?.fit()
      setActiveView(elevation)
    }
  }

  const handleExitElevation = () => {
    const views = bimComponents?.get(OBC.Views)
    if (views) {
      views.close()
      const renderer = views.world.renderer as OBF.PostproductionRenderer;
      renderer.postproduction.enabled = false;
    }

    const cameraProjection = bimComponents?.get(CameraProjection)
    cameraProjection?.setPerspective()
    fitCamera?.fit()

    setActiveView(null)
  }

  const handleDownload = (floorplan: string, event: React.MouseEvent) => {
    event.stopPropagation()
    console.log(`${t('downloadTitle')}: ${floorplan}`)
  }

  // Filter elevations based on search query
  const filteredElevations = React.useMemo(() => {
    if (!query.trim()) return elevations
    return elevations.filter(elevation => 
      elevation.toLowerCase().includes(query.toLowerCase())
    )
  }, [elevations, query])

  return (
    <CollapsibleSection
      title={t('elevationTitle')}
      icon={LR.House}
      className="h-1/3 overflow-y-auto"
      itemCount={filteredElevations.length}
    >
      {activeView && (
        <div className="mb-2 p-2 bg-accent rounded-md border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs">
              Viewing: {activeView}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExitElevation}
              className="h-6 text-xs px-2"
            >
              <LR.X className="h-3 w-3 mr-1" />
              Exit
            </Button>
          </div>
        </div>
      )}
      {filteredElevations.map((elevation, index) => (
        <div key={index} className={`flex items-center justify-between m-2 px-2 py-1 hover:bg-accent/50 rounded-md transition-colors ${activeView === elevation ? 'bg-accent' : ''}`}>
          <div title={`${t('goToElevation')}: ${t(elevation)}`}
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
            onClick={() => handleGoToElevation(elevation)}
          >
            <LR.Layers2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-foreground truncate cursor-pointer">{t(elevation)}</span>
            {activeView === elevation && (
              <LR.Eye className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0"
            onClick={(event) => handleDownload(elevation, event)}
            title={t('downloadTitle')}
          >
            <LR.Download className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </CollapsibleSection>
  )
}
