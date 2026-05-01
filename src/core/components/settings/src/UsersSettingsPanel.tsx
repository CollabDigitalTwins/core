"use client"

import { DataMenu } from '../../viewers/Data/DataMenu'
import { ViewerNames } from '../../../types'

export default function UsersSettingsPanel() {
  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <DataMenu currentViewer={ViewerNames.users} height="h-full" hideTitle hideFrame />
    </div>
  )
}
