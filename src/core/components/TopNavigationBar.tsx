"use client"

// Shadcn Components
import * as React from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { MenusContext } from '../store'
import { Button } from '../components/ui/Button'
import { useSidebar } from '../components/ui/Sidebar'
import * as LR from 'lucide-react'
import {
  Menubar,
  MenubarContent,
  MenubarMenu,
  MenubarTrigger,
} from '../components/ui/Menubar'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

import { ViewerNames } from '../types'
import Geocoder from './viewers/map/src/Geocoder'

// The BIM and PointCloud search tools used to be statically imported at the
// top of this file, even though the JSX below only renders them when the
// matching viewer is active. The static imports pulled @thatopen and
// Potree-adjacent code into the eager bundle. Switching to next/dynamic ties
// their code to the matching viewer's lazy chunk.
const BIMSearchTool = dynamic(
  () => import('./viewers/bim/src/tools/BIMSearchTool'),
  { ssr: false },
)
const PCSearchTool = dynamic(
  () => import('./viewers/pointcloud/src/tools/PCSearchTool'),
  { ssr: false },
)



// Components

export default function NavigationBar() {
  // Translations
  const t = useTranslations('NavigationBar')

  // Access the sidebar context to trigger state changes
  const { toggleInfoSidebar, openInfo } = useSidebar()
  const { state: menusState } = React.useContext(MenusContext)
  const { currentViewer } = menusState.menus

  const needsInfoSidebar = currentViewer === ViewerNames.bim || currentViewer === ViewerNames.pointcloud || currentViewer === ViewerNames.map

  // Hide the NavigationBar when InfoSidebar is open in BIM mode
  if (needsInfoSidebar && openInfo) {
    return null
  }

  return (
    <Menubar className="flex-row absolute z-20 m-3 bg-transparent border-none shadow-none w-auto h-auto">
      <Menubar className="flex px-3 gap-1 h-full justify-between items-start">
        <MenubarMenu>
          <VisuallyHidden>
            <MenubarTrigger />
            <MenubarContent />
          </VisuallyHidden>
        </MenubarMenu>

          {needsInfoSidebar && (
            <Button
              variant="ghost"
              size="icon"
              className="group/sidebar-trigger w-6  justify-end opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
              onClick={toggleInfoSidebar}
              title={t('openInfoTitle')}
            >
              <LR.Menu className="h-4 w-4" />
            </Button>
          )}

      {/* geocode search */}
      {currentViewer === ViewerNames.map && <Geocoder />}
      {currentViewer === ViewerNames.bim && <BIMSearchTool />}
      {currentViewer === ViewerNames.pointcloud && <PCSearchTool />}
      </Menubar>
    </Menubar>
  )
}