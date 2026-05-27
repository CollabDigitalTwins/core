'use client'

import * as React from 'react'
import { bimToolbarTools } from './src/tools/bimToolbar'
import { ToolbarBody } from '../../ToolbarBody'

// Audit Phase 1.A (F-1e): lives in the BIM viewer folder so the dynamic
// import in Toolbar.tsx ties this component into the same async chunk
// graph as BimViewer (F-1) / BimLayer (F-1b). bimToolbarTools() imports
// the BIM tool registry which transitively pulls @thatopen — keeping all
// of it behind this lazy boundary is what allows Phase 1.A to drop
// @thatopen out of the eager bundle.
export function BimToolbar() {
  return <ToolbarBody viewer="bim" tools={bimToolbarTools()} />
}
