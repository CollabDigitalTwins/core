'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '../../../../../../../ui/Button'
import * as LR from 'lucide-react'
import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import { BimContext } from '../../../../../../../../store'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { FloorplanIcon } from '../../../../../../../ui/Icons/FloorPlanIcon'
import { ViewsList } from '../../../../ViewsList'
import { CameraProjection } from '../../../../CameraProjection'
import { FitCamera } from '../../../../FitCamera'

interface FloorplanSectionProps {
  query?: string
}

export function FloorplanSection({ query = '' }: FloorplanSectionProps) {
  const t = useTranslations('ViewSection')

  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents } = bimState.bim

  const floorplanListComponent = bimComponents?.get(ViewsList)
  const levelViews = floorplanListComponent?.levelViews || []

  const [activeView, setActiveView] = React.useState<string | null>(null)

  const [floorplans, setFloorplans] = React.useState<string[]>([])

  const fragments = bimComponents?.get(OBC.FragmentsManager)
  const fitCamera = bimComponents?.get(FitCamera)

  React.useEffect(() => {
    if (levelViews?.length === 0) return

    const extractedFloorplans: { id: string; elevation: number }[] = []

    // Iterate through all views
    levelViews.map((view) => {
      const { id } = view

      // Get the elevation from the view's camera position
      const elevation = view.camera?.three?.position?.y || 0
      const floorplan = { id, elevation }

      extractedFloorplans.push(floorplan)

      extractedFloorplans.sort((a, b) => a.elevation - b.elevation)
    })

    const floorplanList = extractedFloorplans.map(f => f.id)

    setFloorplans(floorplanList)
  }, [levelViews])

  const handleGoToLevel = (floorplan: string) => {
    const views = bimComponents?.get(OBC.Views)
    if (!views) return

    if (activeView === floorplan) {
      handleExitFloorPlan()
    } else {
      views.open(floorplan)
      const renderer = views.world.renderer as OBF.PostproductionRenderer;
      renderer.postproduction.enabled = true;
      renderer.postproduction.style = 1;
      
      fragments.core.update(true)
      fitCamera?.fit()
      setActiveView(floorplan)
    }
  }

  const handleExitFloorPlan = () => {
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

  // Filter floorplans based on search query
  const filteredFloorplans = React.useMemo(() => {
    if (!query.trim()) return floorplans
    return floorplans.filter(floorplan => 
      floorplan.toLowerCase().includes(query.toLowerCase())
    )
  }, [floorplans, query])

  return (
    <CollapsibleSection
      title={t('floorplanTitle')}
      icon={FloorplanIcon}
      className="h-1/3 overflow-y-auto"
      itemCount={filteredFloorplans.length}
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
              onClick={handleExitFloorPlan}
              className="h-6 text-xs px-2"
            >
              <LR.X className="h-3 w-3 mr-1" />
              Exit
            </Button>
          </div>
        </div>
      )}
      {filteredFloorplans.map((floorplan, index) => (
        <div key={index} className={`flex items-center justify-between m-2 px-2 py-1 hover:bg-accent/50 rounded-md transition-colors ${activeView === floorplan ? 'bg-accent' : ''}`}>
          <div title={`${t('goToLevel')}: ${floorplan}`}
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
            onClick={() => handleGoToLevel(floorplan)}
          >
            <LR.Layers2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-foreground truncate cursor-pointer">{floorplan}</span>
            {activeView === floorplan && (
              <LR.Eye className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0"
            onClick={(event) => handleDownload(floorplan, event)}
            title={t('downloadTitle')}
          >
            <LR.Download className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </CollapsibleSection>
  )
}
