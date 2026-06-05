'use client'

import * as React from 'react'
import { bimToolbarTools } from './src/tools/bimToolbar'
import { ToolbarBody } from '../../ToolbarBody'

export function BimToolbar() {
  return <ToolbarBody viewer="bim" tools={bimToolbarTools()} />
}
