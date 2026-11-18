// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'

import { ViewerNames } from '../../../types/dbTypes'
import { canSeeSettingsTab } from '../../settings/src/settingsTabs'
import { SIDEBAR_TAB_META } from '../../ui/ViewerSidebar/sidebarTabs'

import { findToolTarget, MEASURE_REGION, setToolOpen } from './platformHost'
import { chromeOf, DATA_PAGES, item, pluginItem, step, toolStepId, VIEWER_TOOLS } from './platformTourSteps'
import { NO_PLUGIN_ENTRIES } from './usePluginTourEntries'

import type { DataPage, MeasureKind, PlatformTourActions, PlatformTourId, Translate, ViewerChrome } from './platformTourTypes'
import type { PluginEntry, PluginTourEntries } from './usePluginTourEntries'
import type { SidebarTabType } from '../../../store/Menus/reducer'
import type { ViewerKey } from '../../../types/dbTypes'
import type { SettingsTabKey } from '../../settings/src/types'
import type { TourItem, TourStep } from '../tourTypes'

export interface SubTour {
  steps: TourStep[]
  /** Runs while the tour is open, for state every step needs, such as an open dialog; returns its undo. */
  setup?: () => () => void
}

type Icon = TourItem['icon']

export const PANEL_TABS = Object.keys(SIDEBAR_TAB_META) as SidebarTabType[]

const MAP_CONTROLS = () => document.querySelector('.maplibregl-ctrl-top-right .maplibregl-ctrl-group')

const DATASETS_TOOL = 'map-database'

const withEntry = (s: TourStep, onEnter: TourStep['onEnter']): TourStep => ({ ...s, onEnter })

const items = (t: Translate, key: string, entries: [id: string, icon: Icon, onSelect?: () => void][]) =>
  entries.map(([id, icon, onSelect]) => item(t, key, id, icon, onSelect))

const shareItems = (t: Translate, a: PlatformTourActions) => items(t, 'shareOptions.items', [
  ['qr', LR.ScanQrCode, () => a.pressControl('share-qr')],
  ['copy', LR.Link, () => a.pressControl('share-copy')],
  ['screenshot', LR.Camera, () => a.pressControl('share-screenshot')],
])

const ADD_OPTIONS: [id: string, icon: Icon, subject: string][] = [
  ['file', LR.FilePlus, 'File'], ['comment', LR.MessageCircle, 'Comment'], ['dataset', LR.Database, 'File'],
  ['site', LR.BoxSelect, 'Site'], ['sensor', LR.Radio, 'Sensor'], ['building', LR.Building2, 'Building'],
]

const MAP_TAB_SUBJECT: Partial<Record<SidebarTabType, string>> = { file: 'File', layers: 'File', communication: 'Comment', sensors: 'Sensor' }

const SETTINGS_SECTIONS: [key: SettingsTabKey, icon: Icon][] = [['account', LR.UserRound], ['users', LR.Users], ['organization', LR.Building2]]

function toolItems(t: Translate, toolId: string, a: PlatformTourActions): TourItem[] | undefined {
  const key = `tools.${toolId}.items`
  const from = toolStepId(toolId)
  switch (toolId) {
    case 'map-database':
      return items(t, key, [['open', LR.Database, () => a.branch('datasets', from)]])
    case 'map-add':
      return items(t, key, ADD_OPTIONS.filter(([, , subject]) => a.can('create', subject)).map(([id, icon]) => [id, icon]))
    case 'map-measure':
      return items(t, key, [
        ['distance', LR.Ruler, () => a.branch('measure', from, 'distance')],
        ['area', LR.Square, () => a.branch('measure', from, 'area')],
        ['clear', LR.X],
      ])
    case 'map-share':
    case 'bim-share':
      return shareItems(t, a)
    default:
      return undefined
  }
}

const openWhileShown = (toolId: string) => () => {
  setToolOpen(toolId, true)
  return () => setToolOpen(toolId, false)
}

const pluginToolStep = (t: Translate, tool: PluginEntry): TourStep => ({
  id: toolStepId(tool.id),
  target: () => findToolTarget(tool.id),
  title: tool.label,
  body: t('tools.plugin.body'),
  scroll: false,
  onEnter: openWhileShown(tool.id),
})

function toolSteps(t: Translate, chrome: ViewerChrome, a: PlatformTourActions, plugins: PluginTourEntries): TourStep[] {
  const core = VIEWER_TOOLS[chrome].map(({ id }): TourStep => ({
    ...step(t, toolStepId(id), () => findToolTarget(id), `tools.${id}`),
    scroll: false,
    items: toolItems(t, id, a),
    onEnter: id === DATASETS_TOOL ? undefined : openWhileShown(id),
  }))
  return [...core, ...plugins.tools[chrome].map(tool => pluginToolStep(t, tool))]
}

function panelSteps(t: Translate, chrome: ViewerChrome, a: PlatformTourActions, plugins: PluginTourEntries): TourStep[] {
  const tabs = [
    ...PANEL_TABS
      .filter(tab => chrome === 'bim' || !MAP_TAB_SUBJECT[tab] || a.can('read', MAP_TAB_SUBJECT[tab]))
      .map(tab => item(t, 'panelTabs.items', tab, SIDEBAR_TAB_META[tab].icon, () => a.branch(`panel-${tab}`, 'panel'))),
    ...plugins.tabs[chrome].map(tab => pluginItem(t('panelTabs.plugin'), tab, () => a.selectPanelTab(tab.id))),
  ]
  return [
    step(t, 'panel-toggle', 'viewer-panel-toggle', `panel.${chrome}`),
    { ...withEntry(step(t, 'panel', 'viewer-panel', `panelTabs.${chrome}`), a.openPanel), items: tabs },
  ]
}

function mapControlSteps(t: Translate, a: PlatformTourActions): TourStep[] {
  return [
    {
      ...step(t, 'navigation', MAP_CONTROLS, 'mapControls'),
      scroll: false,
      items: items(t, 'mapControls.items', [['zoomIn', LR.Plus, a.zoomIn], ['zoomOut', LR.Minus, a.zoomOut], ['compass', LR.Compass, a.resetNorth]]),
    },
    { ...step(t, 'map-settings', 'map-settings', 'mapSettings'), scroll: false, items: [item(t, 'mapSettings.items', 'open', LR.Settings2, () => a.branch('panel-settings', 'map-settings'))] },
  ]
}

function viewerTour(t: Translate, chrome: ViewerChrome, a: PlatformTourActions, plugins: PluginTourEntries): SubTour {
  return {
    steps: [
      withEntry(step(t, 'intro', null, `viewerTour.${chrome}`), () => a.openViewer(ViewerNames[chrome])),
      chrome === 'map' ? withEntry(step(t, 'search', 'viewer-search', 'searchDemo'), a.demoSearch) : step(t, 'search', 'viewer-search', 'search.bim'),
      ...panelSteps(t, chrome, a, plugins),
      ...(chrome === 'map' ? mapControlSteps(t, a) : []),
      ...toolSteps(t, chrome, a, plugins),
    ],
  }
}

const DATASET_COLLECTIONS: [id: string, icon: Icon, tab: string][] = [
  ['applied', LR.Layers, 'applied'], ['favourites', LR.Star, 'favourites'], ['organizational', LR.Building, 'organizational'],
  ['all', LR.Database, 'all'], ['national', LR.Flag, 'national'], ['subdivision', LR.Map, 'countrySubdivision'],
  ['municipal', LR.Building2, 'municipal'], ['liveData', LR.Radio, 'liveData'],
]

function datasetsTour(t: Translate, a: PlatformTourActions): SubTour {
  const key = 'datasetsTour'
  return {
    setup: () => {
      setToolOpen(DATASETS_TOOL, true)
      return () => setToolOpen(DATASETS_TOOL, false)
    },
    steps: [
      { ...step(t, 'search', 'datasets-search', `${key}.search`), items: items(t, `${key}.search.items`, [['search', LR.Search], ['filters', LR.ListFilter], ...(a.can('create', 'OpenDataPortal') ? [['addPortal', LR.Plus] as [string, Icon]] : [])]) },
      {
        ...step(t, 'tabs', 'datasets-tabs', `${key}.tabs`),
        items: items(t, `${key}.tabs.items`, DATASET_COLLECTIONS.map(([id, icon, tab]) => [id, icon, () => a.pressControl(`datasets-tab-${tab}`)])),
      },
      {
        ...step(t, 'list', 'datasets-list', `${key}.list`),
        items: items(t, `${key}.list.items`, [['apply', LR.SquareCheck], ['favourite', LR.Star], ['publish', LR.UploadCloud], ['details', LR.ChevronRight]]),
      },
    ],
  }
}

function measureTour(t: Translate, a: PlatformTourActions): SubTour {
  const demo = (kind: MeasureKind): TourStep => ({
    ...withEntry(step(t, kind, MEASURE_REGION, `measureDemo.${kind}`), () => a.demoMeasure(kind)),
    scroll: false,
  })
  return { steps: [demo('distance'), demo('area')] }
}

function layersSteps(t: Translate, chrome: ViewerChrome): TourStep[] {
  const key = 'panelTour.layers'
  if (chrome === 'bim') {
    return [
      { ...step(t, 'drawings', 'panel-layers-drawings', `${key}.drawings`), items: items(t, `${key}.drawings.items`, [['floorplans', LR.LayoutGrid], ['elevations', LR.Building], ['custom', LR.PencilRuler]]) },
      { ...step(t, 'classifier', 'panel-layers-classifier', `${key}.classifier`), items: items(t, `${key}.classifier.items`, [['spatial', LR.ListTree], ['ifcClasses', LR.Tags]]) },
    ]
  }
  return [
    step(t, 'applied', 'panel-layers-applied', `${key}.applied`),
    {
      ...step(t, 'available', 'panel-layers-available', `${key}.available`),
      items: items(t, `${key}.available.items`, [
        ['favourites', LR.Star], ['organizational', LR.Building], ['all', LR.Database], ['national', LR.Flag],
        ['subdivision', LR.Map], ['municipal', LR.Building2], ['liveData', LR.Radio],
      ]),
    },
  ]
}

function panelTabSteps(t: Translate, tab: SidebarTabType, chrome: ViewerChrome): TourStep[] {
  const key = `panelTour.${tab}`
  const search = step(t, 'search', 'panel-search', 'panelTour.search')
  switch (tab) {
    case 'file':
      return [search, { ...step(t, 'sections', 'panel-file-sections', `${key}.sections`), items: items(t, `${key}.sections.items`, [['bim', LR.Box], ['models', LR.FileAxis3d], ['pointClouds', LR.Grip], ['files', LR.FileText]]) }]
    case 'layers':
      return [search, ...layersSteps(t, chrome)]
    case 'communication':
      return [
        ...(chrome === 'bim' ? [{ ...step(t, 'topics', 'panel-tab', `${key}.topics`), items: items(t, `${key}.topics.items`, [['add', LR.Plus], ['export', LR.Download], ['import', LR.Upload]]) }] : []),
        { ...step(t, 'comments', 'panel-comments', `${key}.comments`), items: items(t, `${key}.comments.items`, [['search', LR.Search], ['add', LR.Plus], ['visibility', LR.Eye]]) },
      ]
    case 'sensors':
      return [
        { ...step(t, 'toolbar', 'panel-sensors-toolbar', `${key}.toolbar`), items: items(t, `${key}.toolbar.items`, [['search', LR.Search], ['visibility', LR.Eye], ['legend', LR.Palette], ['filters', LR.Funnel]]) },
        step(t, 'list', 'panel-sensors', `${key}.list`),
      ]
    case 'settings':
      return [{
        ...step(t, 'sections', 'panel-tab', `${key}.${chrome}`),
        items: chrome === 'map'
          ? items(t, `${key}.map.items`, [['style', LR.Map], ['measurements', LR.Ruler], ['location', LR.MapPin]])
          : items(t, `${key}.bim.items`, [['camera', LR.Camera], ['grid', LR.Grid3x3], ['measurements', LR.Ruler], ['lighting', LR.Sun], ['pointClouds', LR.Grip], ['splats', LR.Sparkles]]),
      }]
  }
}

function panelTabTour(t: Translate, tab: SidebarTabType, chrome: ViewerChrome, a: PlatformTourActions): SubTour {
  return {
    setup: () => {
      const close = a.openPanel()
      a.selectPanelTab(tab)
      return close
    },
    steps: panelTabSteps(t, tab, chrome),
  }
}

function dataTour(t: Translate, page: DataPage, a: PlatformTourActions): SubTour {
  return {
    steps: [
      {
        id: 'title',
        target: 'data-title',
        title: t(`data.items.${page}.term`),
        body: `${t(`data.items.${page}.description`)}\n${t('dataPage.title.body')}`,
        onEnter: () => a.openViewer(ViewerNames[page]),
      },
      step(t, 'filters', 'data-filters', 'dataPage.filters'),
      step(t, 'table', 'data-table', 'dataPage.table'),
    ],
  }
}

function pluginsTour(t: Translate, a: PlatformTourActions): SubTour {
  const key = 'pluginsTour'
  return {
    steps: [
      {
        ...withEntry(step(t, 'tabs', 'plugins-tabs', `${key}.tabs`), () => a.openViewer(ViewerNames.plugins)),
        items: items(t, `${key}.tabs.items`, [['all', LR.Blocks], ['running', LR.Play], ['installed', LR.PackageCheck], ['notInstalled', LR.PackagePlus], ['search', LR.Search]]),
      },
      {
        ...step(t, 'list', 'plugins-list', `${key}.list`),
        items: items(t, `${key}.list.items`, [['run', LR.Power], ['install', LR.Download], ['enable', LR.Building2], ['visibleTo', LR.Users], ['details', LR.ChevronRight]]),
      },
    ],
  }
}

function settingsTour(t: Translate, a: PlatformTourActions): SubTour {
  return {
    steps: [
      {
        ...withEntry(step(t, 'sections', 'settings-sections', 'settingsPage.sections'), () => a.openViewer(ViewerNames.settings)),
        items: items(t, 'settingsPage.sections.items', SETTINGS_SECTIONS
          .filter(([key]) => canSeeSettingsTab(a.can, key))
          .map(([key, icon]) => [key, icon, () => a.pressControl(`settings-tab-${key}`)])),
      },
      step(t, 'content', 'settings-content', 'settingsPage.content'),
    ],
  }
}

export const dataPageOf = (tour: PlatformTourId) => DATA_PAGES.find(({ page }) => tour === `data-${page}`)?.page

export const panelTabOf = (tour: PlatformTourId) => PANEL_TABS.find(tab => tour === `panel-${tab}`)

/** The closer tour an item opens; `viewer` picks the map or BIM version of a side panel tab. */
export function subTour(tour: Exclude<PlatformTourId, 'platform'>, t: Translate, a: PlatformTourActions, viewer?: ViewerKey, plugins = NO_PLUGIN_ENTRIES): SubTour {
  const page = dataPageOf(tour)
  const tab = panelTabOf(tour)
  if (page) return dataTour(t, page, a)
  if (tab) return panelTabTour(t, tab, chromeOf(viewer) ?? 'map', a)
  if (tour === 'settings') return settingsTour(t, a)
  if (tour === 'plugins') return pluginsTour(t, a)
  if (tour === 'datasets') return datasetsTour(t, a)
  if (tour === 'measure') return measureTour(t, a)
  return viewerTour(t, tour as ViewerChrome, a, plugins)
}
