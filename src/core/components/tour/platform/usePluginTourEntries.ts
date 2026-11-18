'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { resolvePluginIcon } from '../../../plugins/host/pluginIcon'
import { usePluginContributions } from '../../../plugins/host/provider'
import { pluginToolId } from '../../../plugins/host/usePluginToolbarTools'
import { pluginTabId } from '../../../plugins/host/usePluginViewerTabs'
import { usePluginMessageLookup } from '../../../plugins/sdk/messages'

import type { ViewerChrome } from './platformTourTypes'
import type { PluginContribution } from '../../../plugins/host/provider'
import type { ToolbarCapability } from '../../../plugins/host/usePluginToolbarTools'
import type { SidebarTabKey } from '../../../store/Menus/reducer'
import type { TourItem } from '../tourTypes'

export interface PluginEntry<Id extends string = string> { id: Id; label: string; icon: TourItem['icon'] }

/** The toolbar tools and side panel tabs plugins add to each viewer, so the tour covers them too. */
export interface PluginTourEntries {
  tools: Record<ViewerChrome, PluginEntry[]>
  tabs: Record<ViewerChrome, PluginEntry<SidebarTabKey>[]>
}

export const NO_PLUGIN_ENTRIES: PluginTourEntries = { tools: { map: [], bim: [] }, tabs: { map: [], bim: [] } }

export function usePluginTourEntries(): PluginTourEntries {
  const mapTools = usePluginContributions('map.tools')
  const bimTools = usePluginContributions('bim.tools')
  const tabs = usePluginContributions('viewer.tabs')
  const message = usePluginMessageLookup()

  return React.useMemo(() => {
    const tool = (contribution: PluginContribution<ToolbarCapability>): PluginEntry => ({
      id: pluginToolId(contribution), label: contribution.label, icon: resolvePluginIcon(contribution.icon),
    })
    const tabsFor = (chrome: ViewerChrome): PluginEntry<SidebarTabKey>[] => tabs
      .filter(tab => !tab.viewers || tab.viewers.includes(chrome))
      .map(tab => ({
        id: pluginTabId(tab.pluginId, tab.id),
        label: message(tab.pluginId, tab.labelKey, tab.labelKey),
        icon: resolvePluginIcon(tab.icon),
      }))
    return {
      tools: { map: mapTools.map(tool), bim: bimTools.map(tool) },
      tabs: { map: tabsFor('map'), bim: tabsFor('bim') },
    }
  }, [mapTools, bimTools, tabs, message])
}
