'use client'

import * as React from 'react'
import { Menubar } from './ui/Menubar'
import { Tool } from '../types/tools'
import ToolbarButton from './ui/ToolbarButton'
import { SubmenuProvider } from './ToolbarSubmenu'

// Audit Phase 1.A (F-1e): shared menubar wrapper used by the per-viewer
// toolbars (MapToolbar inline in Toolbar.tsx, BimToolbar + PointCloudToolbar
// in their respective viewer folders so they ride the viewer's lazy chunk).
// Extracted from Toolbar.tsx to avoid duplicating the JSX across three sites.

interface Props {
  viewer: string
  tools: Tool[]
}

export function ToolbarBody({ viewer, tools }: Props) {
  return (
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
  )
}
