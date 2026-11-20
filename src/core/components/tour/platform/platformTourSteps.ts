// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'

import { ViewerNames } from '../../../types/dbTypes'

import { MenuPathText } from './MenuPathText'

import type { DataPage, PlatformTourActions, PlatformTourId, TourAvailability, Translate, ViewerChrome } from './platformTourTypes'
import type { PluginEntry } from './usePluginTourEntries'
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

export const VIEWERS: { viewer: ViewerChrome; icon: Icon }[] = [
  { viewer: 'map', icon: LR.Map },
  { viewer: 'bim', icon: LR.Box },
]

export const DATA_PAGES: { page: DataPage; icon: Icon }[] = [
  { page: 'sites', icon: LR.BoxSelect },
  { page: 'buildings', icon: LR.Building2 },
  { page: 'files', icon: LR.GalleryVerticalEnd },
  { page: 'infrastructure', icon: LR.TrainTrack },
]

export const EVERYTHING_AVAILABLE: TourAvailability = {
  viewers: VIEWERS.map(({ viewer }) => viewer),
  dataPages: DATA_PAGES.map(({ page }) => page),
}

/** The tour of the page the viewer is on, folded into the overview and offered as a shortcut from its first card. */
export interface PageSection {
  tour: PlatformTourId
  label: string
  steps: TourStep[]
}

interface OverviewOptions {
  languages?: Language[]
  available?: TourAvailability
  section?: PageSection
}

export const toolStepId = (toolId: string) => `tool-${toolId}`

export const chromeOf = (viewer: ViewerKey | undefined): ViewerChrome | null =>
  viewer === ViewerNames.map ? 'map' : viewer === ViewerNames.bim ? 'bim' : null

export const dataPageOfViewer = (viewer: ViewerKey | undefined) => DATA_PAGES.find(({ page }) => page === viewer)?.page

export const step = (t: Translate, id: string, target: TourStep['target'], key = id): TourStep => ({
  id, target, title: t(`${key}.title`), body: t(`${key}.body`),
})

export const withEntry = (s: TourStep, onEnter: TourStep['onEnter']): TourStep => ({ ...s, onEnter })

export const item = (t: Translate, key: string, id: string, icon: Icon, onSelect?: () => void): TourItem => ({
  id, icon, onSelect, term: t(`${key}.${id}.term`), description: t(`${key}.${id}.description`),
})

export const pluginItem = (description: string, entry: PluginEntry, onSelect: () => void): TourItem => ({
  id: entry.id, icon: entry.icon, term: entry.label, description, onSelect,
})

const withMenuPath = (t: Translate, s: TourStep, key = s.id): TourStep => ({
  ...s,
  body: React.createElement(MenuPathText, { text: t(`${key}.body`), labels: { support: t('menuPath.support'), guide: t('menuPath.guide') } }),
})

export const availableViewers = (available: TourAvailability) => VIEWERS.filter(({ viewer }) => available.viewers.includes(viewer))

export const availableDataPages = (available: TourAvailability) => DATA_PAGES.filter(({ page }) => available.dataPages.includes(page))

function interfaceSteps(t: Translate, available: TourAvailability, a: PlatformTourActions): TourStep[] {
  const viewers = {
    ...step(t, 'viewers', 'sidebar-viewers'),
    items: availableViewers(available).map(({ viewer, icon }) => item(t, 'viewers.items', viewer, icon, () => a.branch(viewer, 'viewers'))),
  }
  const pages = availableDataPages(available)
  if (pages.length === 0) return [viewers]
  return [
    step(t, 'interfaces', 'sidebar-interfaces'),
    viewers,
    { ...step(t, 'data', 'sidebar-data'), items: pages.map(({ page, icon }) => item(t, 'data.items', page, icon, () => a.branch(`data-${page}`, 'data'))) },
  ]
}

function languageSteps(t: Translate, languages: Language[], a: PlatformTourActions): TourStep[] {
  if (languages.length < 2) return []
  return [{
    ...step(t, 'language', 'sidebar-language'),
    items: languages.map(language => item(t, 'language.items', language, LR.Languages, () => a.switchLanguage(language))),
  }]
}

const singleOr = <T>(options: T[], several: PlatformTourId, only: (option: T) => PlatformTourId) =>
  options.length > 1 ? several : only(options[0])

function exploreStep(t: Translate, available: TourAvailability, a: PlatformTourActions): TourStep {
  const viewers = available.viewers
  const pages = available.dataPages
  return {
    ...withMenuPath(t, step(t, 'explore', null)),
    items: [
      ...(viewers.length ? [item(t, 'explore.items', 'viewers', LR.Box, () => a.branch(singleOr(viewers, 'explore-viewers', v => v), 'explore'))] : []),
      ...(pages.length ? [item(t, 'explore.items', 'data', LR.Table2, () => a.branch(singleOr(pages, 'explore-data', p => `data-${p}`), 'explore'))] : []),
    ],
  }
}

const withShortcut = (section: PageSection | undefined, a: PlatformTourActions) => (s: TourStep): TourStep =>
  section ? { ...s, shortcut: { label: section.label, onSelect: () => a.branch(section.tour, s.id) } } : s

function sidebarSteps(t: Translate, a: PlatformTourActions, languages: Language[], available: TourAvailability): TourStep[] {
  return [
    step(t, 'sidebar', 'sidebar'),
    ...interfaceSteps(t, available, a),
    { ...step(t, 'plugins', 'sidebar-plugins'), items: [item(t, 'plugins.items', 'open', LR.Blocks, () => a.branch('plugins', 'plugins'))] },
    ...languageSteps(t, languages, a),
    {
      ...step(t, 'support', 'sidebar-support'),
      items: [
        item(t, 'support.items', 'guide', LR.Compass),
        item(t, 'support.items', 'contact', LR.Send, a.openContactPage),
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
  ].map(s => withEntry(s, a.openMenu))
}

/** The platform overview, then the page the viewer is on, ending on a choice of closer tours; overview cards offer a shortcut to that page's tour. */
export function platformTourSteps(t: Translate, a: PlatformTourActions, { languages = [], available = EVERYTHING_AVAILABLE, section }: OverviewOptions = {}): TourStep[] {
  const shortcut = withShortcut(section, a)
  return [
    ...[withMenuPath(t, step(t, 'welcome', null)), ...sidebarSteps(t, a, languages, available)].map(shortcut),
    ...(section?.steps ?? []),
    shortcut(exploreStep(t, available, a)),
  ]
}
