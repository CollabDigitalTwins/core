"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ViewerNames } from '../../../types'
import { DataMenu } from '../../viewers/Data/DataMenu'

export default function UsersSettingsPanel() {
  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <DataMenu currentViewer={ViewerNames.users} height="h-full" hideTitle hideFrame />
    </div>
  )
}
