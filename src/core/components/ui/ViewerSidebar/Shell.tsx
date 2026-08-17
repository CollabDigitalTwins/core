'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { BuildingsContext, MenusContext } from '../../../store'

import { Header } from './Header'
import { resolveActiveTabId, sidebarPanelId, sidebarTabId, visibleSidebarTabs } from './sidebarTabs'
import { TabStrip } from './TabStrip'

import type { ViewerSidebarTab } from './sidebarTabs'
import type { Organization } from '../../../types/dbTypes'

interface ViewerSidebarShellProps {
  /** Tabs this viewer contributes, in display order. */
  tabs: ViewerSidebarTab[]
  organization?: Organization
}

/**
 * Chrome shared by every viewer sidebar: the building header, the tab strip, and
 * the panel for whichever tab is active. A viewer supplies its tab list and nothing
 * else — the selected-tab wiring used to be copy-pasted into each of them.
 */
export function ViewerSidebarShell({ tabs, organization }: ViewerSidebarShellProps) {
  const { state: buildingState } = React.useContext(BuildingsContext)
  const { building: currentBuilding } = buildingState.buildings

  const { state: menusState, dispatch: menusDispatch } = React.useContext(MenusContext)
  const { selectedTab } = menusState.menus

  // State
  const [loadingBuildingInfo] = React.useState(false)

  const visibleTabs = visibleSidebarTabs(tabs)
  const activeTabId = resolveActiveTabId(tabs, selectedTab)

  const handleTabChange = React.useCallback((tab: typeof selectedTab) => {
    menusDispatch({ type: 'SET_SIDEBAR_SELECTED_TAB', payload: { selectedTab: tab } })
  }, [menusDispatch])

  // The fallback deliberately stays out of the store. `selectedTab` is the user's
  // choice; writing a fallback back into it made transient tab lists permanent —
  // permissions resolve after the first render, so every `ability.can(...)` tab
  // starts hidden, Settings is briefly the only tab left, and the sync effect
  // latched it as the selection for every viewer.
  const activeTab = visibleTabs.find(tab => tab.id === activeTabId)

  return (
    // Fills the ViewerSidebar overlay wrapper (Sidebar.tsx), which owns the resizable width.
    // pr-2 keeps a consistent right gutter so content never sits flush against the edge/handle.
    <div className="w-full flex flex-col h-full min-h-0 bg-background border-r border-border pr-2">
      <Header
        currentBuilding={currentBuilding}
        loadingBuildingInfo={loadingBuildingInfo}
        organization={organization}
      />

      {activeTabId && (
        <TabStrip
          tabs={visibleTabs}
          activeTab={activeTabId}
          onTabChangeAction={handleTabChange}
        />
      )}

      {activeTab && (
        <div
          role="tabpanel"
          id={sidebarPanelId(activeTab.id)}
          aria-labelledby={sidebarTabId(activeTab.id)}
          className="flex-1 min-h-0 flex flex-col"
        >
          {activeTab.content}
        </div>
      )}
    </div>
  )
}
