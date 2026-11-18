'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useSidebar } from '../../components/ui/Sidebar'
import { useMenusContext } from '../../store'

import type { ViewerKey } from '../../types/dbTypes'

/** Switches to `viewer` the way the app sidebar does: selections cleared, table view, side panel closed. */
export function useChangeViewer(): (viewer: ViewerKey) => void {
  const { dispatch, setSelectedItem, setSelectedSite, setSelectedFile, setView } = useMenusContext()
  const { setOpenInfo } = useSidebar()
  return React.useCallback((viewer: ViewerKey) => {
    setSelectedItem(null)
    setSelectedSite(null)
    setSelectedFile(null)
    setView('table')
    dispatch({ type: 'SET_VIEWER', payload: { currentViewer: viewer } })
    setOpenInfo(false)
  }, [dispatch, setSelectedItem, setSelectedSite, setSelectedFile, setView, setOpenInfo])
}
