// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'

import { ViewerNames } from '../../../types/dbTypes'

import { NO_PLUGIN_ENTRIES } from './usePluginTourEntries'

import type { DataPage, PlatformTourActions, Translate, ViewerChrome } from './platformTourTypes'
import type { PluginEntry, PluginTourEntries } from './usePluginTourEntries'
import type { Language, ViewerKey } from '../../../types/dbTypes'
import type { TourItem, TourStep } from '../tourTypes'

export const PLATFORM_TOUR_ID = 'platform'

type Icon = TourItem['icon']

export const VIEWER_TOOLS: Record<ViewerChrome, { id: string; icon: Icon }[]> = {
  map: [
    { id: 'map-compare', icon: LR.Columns3 },
    { id: 'map-database', icon: LR.Database },
    { id: 'map-add', icon: LR.Plus },
    { id: 'map-measure', icon: LR.Ruler },
    { id: 'map-share', icon: LR.Share2 },
  ],
  bim: [
    { id: 'bim-clipping', icon: LR.Crop },
    { id: 'bim-camera-fit', icon: LR.Maximize2 },
    { id: 'bim-add', icon: LR.Plus },
    { id: 'bim-dimensions', icon: LR.Ruler },
    { id: 'bim-share', icon: LR.Share2 },
  ],
}

export const DATA_PAGES: { page: DataPage; icon: Icon }[] = [
  { page: 'sites', icon: LR.BoxSelect },
  { page: 'buildings', icon: LR.Building2 },
  { page: 'files', icon: LR.GalleryVerticalEnd },
  { page: 'infrastructure', icon: LR.TrainTrack },
]

export const toolStepId = (toolId: string) => `tool-${toolId}`

export const chromeOf = (viewer: ViewerKey | undefined): ViewerChrome | null =>
  viewer === ViewerNames.map ? 'map' : viewer === ViewerNames.bim ? 'bim' : null

export const step = (t: Translate, id: string, target: TourStep['target'], key = id): TourStep => ({
  id, target, title: t(`${key}.title`), body: t(`${key}.body`),
})

export const item = (t: Translate, key: string, id: string, icon: Icon, onSelect?: () => void): TourItem => ({
  id, icon, onSelect, term: t(`${key}.${id}.term`), description: t(`${key}.${id}.description`),
})

export const pluginItem = (description: string, entry: PluginEntry, onSelect: () => void): TourItem => ({
  id: entry.id, icon: entry.icon, term: entry.label, description, onSelect,
})

const toolItem = (t: Translate, toolId: string, icon: Icon, onSelect: () => void): TourItem => ({
  id: toolId, icon, onSelect, term: t(`tools.${toolId}.title`), description: t(`tools.${toolId}.body`),
})

function viewerSteps(t: Translate, chrome: ViewerChrome, a: PlatformTourActions, plugins: PluginTourEntries): TourStep[] {
  const goTo = (toolId: string) => () => a.branch(chrome, 'toolbar', toolStepId(toolId))
  const tools = [
    ...VIEWER_TOOLS[chrome].map(tool => toolItem(t, tool.id, tool.icon, goTo(tool.id))),
    ...plugins.tools[chrome].map(tool => pluginItem(t('tools.plugin.body'), tool, goTo(tool.id))),
  ]
  return [
    { ...step(t, 'search', 'viewer-search', `search.${chrome}`), items: [item(t, `search.${chrome}.items`, 'open', LR.Search, () => a.branch(chrome, 'search', 'search'))] },
    { ...step(t, 'panel', 'viewer-panel-toggle', 'viewerPanel'), items: [item(t, 'viewerPanel.items', chrome, LR.PanelLeft, () => a.branch(chrome, 'panel', 'panel'))] },
    { ...step(t, 'toolbar', 'toolbar', `toolbar.${chrome}`), scroll: false, items: tools },
  ]
}

/** The platform overview, top to bottom; its items open a closer tour of the part they name. */
function languageSteps(t: Translate, languages: Language[], a: PlatformTourActions): TourStep[] {
  if (languages.length < 2) return []
  return [{
    ...step(t, 'language', 'sidebar-language'),
    items: languages.map(language => item(t, 'language.items', language, LR.Languages, () => a.switchLanguage(language))),
  }]
}

export function platformTourSteps(viewer: ViewerKey | undefined, t: Translate, a: PlatformTourActions, plugins = NO_PLUGIN_ENTRIES, languages: Language[] = []): TourStep[] {
  const chrome = chromeOf(viewer)
  return [
    step(t, 'welcome', null),
    step(t, 'sidebar', 'sidebar'),
    {
      ...step(t, 'viewers', 'sidebar-viewers'),
      items: [
        item(t, 'viewers.items', 'map', LR.Map, () => a.branch('map', 'viewers')),
        item(t, 'viewers.items', 'bim', LR.Box, () => a.branch('bim', 'viewers')),
      ],
    },
    ...(chrome ? viewerSteps(t, chrome, a, plugins) : []),
    {
      ...step(t, 'data', 'sidebar-data'),
      items: DATA_PAGES.map(({ page, icon }) => item(t, 'data.items', page, icon, () => a.branch(`data-${page}`, 'data'))),
    },
    { ...step(t, 'plugins', 'sidebar-plugins'), items: [item(t, 'plugins.items', 'open', LR.Blocks, () => a.branch('plugins', 'plugins'))] },
    ...languageSteps(t, languages, a),
    {
      ...step(t, 'support', 'sidebar-support'),
      items: [
        item(t, 'support.items', 'guide', LR.Compass),
        item(t, 'support.items', 'contact', LR.Send, a.emailTeam),
        item(t, 'support.items', 'feature', LR.SquarePlus, a.openFeatureRequest),
        item(t, 'support.items', 'bug', LR.Bug, a.openBugReport),
      ],
    },
    {
      ...step(t, 'account', 'sidebar-account'),
      items: [
        item(t, 'account.items', 'settings', LR.Settings, () => a.branch('settings', 'account')),
        item(t, 'account.items', 'signOut', LR.LogOut),
      ],
    },
    step(t, 'done', null),
  ]
}
