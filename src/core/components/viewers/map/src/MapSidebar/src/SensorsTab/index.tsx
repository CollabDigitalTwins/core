'use client'

import * as React from 'react'
import { DbFile } from '../../../../../../../types/dbTypes'
import { SensorsSection } from '../../../../../../ui/Sensors/SensorsSection'
export interface FileItem {
  task: DbFile
  icon: React.ElementType
  visible: boolean
}

export function SensorsTab() {
  return (
    <div className="flex-1 flex flex-col space-y-6 py-4 overflow-hidden">
      <SensorsSection />
    </div>
  )
}
