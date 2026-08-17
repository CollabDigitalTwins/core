// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'

import type { SidebarTabKey, SidebarTabType } from '../../../store/Menus/reducer'
import type * as React from 'react'

/**
 * One tab a viewer contributes to its sidebar. The icon and label come from
 * `SIDEBAR_TAB_META` so every viewer presents the same tab the same way — a viewer
 * only says *which* tabs it has and what goes inside them.
 */
export interface ViewerSidebarTab {
  id: SidebarTabKey
  content: React.ReactNode
  /** Omitted or true = shown. false hides the tab from the strip entirely. */
  enabled?: boolean
  /** Icon and resolved label for a tab with no `SIDEBAR_TAB_META` entry: every plugin tab. */
  meta?: PluginTabMeta
}

// `aria-hidden` is React's Booleanish, not boolean, or a lucide icon fails to fit.
type TabIcon = React.ComponentType<{ className?: string; 'aria-hidden'?: React.AriaAttributes['aria-hidden'] }>

export interface PluginTabMeta {
  icon: TabIcon
  label: string
}

interface SidebarTabMeta {
  icon: TabIcon
  /** Key in the `TabSelector` i18n namespace. */
  labelKey: string
}

/**
 * Icon + label for every sidebar tab, declared once. Previously each viewer's
 * TabSelector repeated this list verbatim.
 */
export const SIDEBAR_TAB_META: Record<SidebarTabType, SidebarTabMeta> = {
  file: { icon: LR.FolderClosed, labelKey: 'fileLabel' },
  layers: { icon: LR.Layers, labelKey: 'layersTitle' },
  communication: { icon: LR.MessageCircle, labelKey: 'communicationTitle' },
  sensors: { icon: LR.Radio, labelKey: 'sensorsTitle' },
  settings: { icon: LR.Settings, labelKey: 'settingsTitle' },
}

/** DOM id of a tab button, referenced by its panel's `aria-labelledby`. */
export function sidebarTabId(id: SidebarTabKey): string {
  return `viewer-sidebar-tab-${id}`
}

/** DOM id of a tab panel, referenced by its button's `aria-controls`. */
export function sidebarPanelId(id: SidebarTabKey): string {
  return `viewer-sidebar-panel-${id}`
}

/** Tabs a viewer actually shows, in declaration order. */
export function visibleSidebarTabs(tabs: ViewerSidebarTab[]): ViewerSidebarTab[] {
  return tabs.filter(tab => tab.enabled !== false)
}

/**
 * The tab to render given the store's persisted selection.
 *
 * `selectedTab` lives in the Menus store and survives a viewer switch, so it can
 * name a tab the new viewer does not have (Sensors in the map -> point cloud, which
 * only has Files and Settings). Falling back to the first visible tab is what keeps
 * the sidebar from rendering an empty body with no tab highlighted.
 *
 * Returns null only when the viewer has no visible tabs at all.
 */
export function resolveActiveTabId(
  tabs: ViewerSidebarTab[],
  selectedTab: SidebarTabKey,
): SidebarTabKey | null {
  const visible = visibleSidebarTabs(tabs)
  if (visible.length === 0) return null
  return visible.some(tab => tab.id === selectedTab) ? selectedTab : visible[0].id
}
