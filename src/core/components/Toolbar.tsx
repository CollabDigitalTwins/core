// Components
import * as React from 'react'
import { Menubar } from './ui/Menubar'
import { ViewerNames } from '../types'
import { Tool } from '../types/tools'
import { mapToolbarTools } from '../components/viewers/map/src/tools/mapTools'
import { bimToolbarTools } from '../components/viewers/bim/src/tools/bimToolbar'

import ToolbarButton from './ui/ToolbarButton'
import { SubmenuProvider } from './ToolbarSubmenu'
import { pointcloudToolbarTools } from './viewers/pointcloud/src/tools'
// Store
import { MenusContext, ToolsContext } from '../store'

interface Props {
  viewer: ViewerNames
}

export function Toolbar({ viewer }: Props) {
  let tools: Tool[] | null = null

  switch (viewer) {
    case ViewerNames.map:
      tools = mapToolbarTools()
      break
    case ViewerNames.bim:
      tools = bimToolbarTools()
      break
    case ViewerNames.pointcloud:
      tools = pointcloudToolbarTools()
      break
    default:
      tools = null
  }

  return (
    <>
      {tools
        && (
          <div className="fixed left-1/2 transform -translate-x-1/2 bottom-[10px] flex items-center pointer-events-none z-10">
            <SubmenuProvider>
              <Menubar
                id={`${viewer}-toolbar`}
                className="flex flex-row px-1 gap-1 justify-center w-fit bg-primary-light rounded space-y-0"
              >
                {tools.map((tool, index) => (
                  <div key={index} className="flex items-center">
                    <ToolbarButton tool={tool} />
                  </div>
                ))}
              </Menubar>
            </SubmenuProvider>
          </div>
        )}
    </>
  )
}
