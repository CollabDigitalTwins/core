'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import dynamic from 'next/dynamic'
import * as React from 'react'

// Icons
import { MenusContext } from '../../../store'
import { MapSidebar } from '../../viewers/map/src/MapSidebar'

import type { Organization } from '../../../types/dbTypes'

const BimSidebar = dynamic(
  () => import('../../viewers/bim/src/BimSidebar/src').then(m => ({ default: m.BimSidebar })),
  { ssr: false },
)

export function ViewerSidebar({ storageBaseUrl, martinBaseUrl, organization }: { storageBaseUrl?: string; martinBaseUrl?: string; organization?: Organization }) {
  const { state: menusState } = React.useContext(MenusContext)
  const { currentViewer } = menusState.menus

  return (
    <>
      {currentViewer === 'map' && <MapSidebar storageBaseUrl={storageBaseUrl} martinBaseUrl={martinBaseUrl} organization={organization} />}
      {currentViewer === 'bim' && <BimSidebar organization={organization} />}
    </>
  )
}
