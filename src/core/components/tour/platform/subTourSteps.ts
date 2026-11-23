// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'

import { ViewerNames } from '../../../types/dbTypes'
import { canSeeSettingsTab } from '../../settings/src/settingsTabs'
import { SIDEBAR_TAB_META } from '../../ui/ViewerSidebar/sidebarTabs'
import { findAnchor } from '../hostTargets'

import { helloMapControl, helloMapInstalledByTour, helloMapRow, isOrgControl } from './helloMapDemo'
import { holdDemo, holdFor, holdFrom } from './liveDemo'
import { placeDialogTarget, placedTarget } from './placeDemo'
import { afterMenusClose, DEMO_DELAY_MS, demoSwitch, demoTabs, findToolTarget, MEASURE_REGION, onClosed, openSection, openToolPanel, setToolOpen } from './platformHost'
import { allEntries, availableDataPages, availableViewers, chromeOf, DATA_PAGES, EVERYTHING_AVAILABLE, item, pluginItem, step, toolStepId, VIEWER_TOOLS, withEntry } from './platformTourSteps'
import { showTourDemo, TOUR_LEGEND_DEMO_TARGET } from './tourDemos'
import { NO_PLUGIN_ENTRIES } from './usePluginTourEntries'
import { restoreZoningSearch, zoningLoadFailed, zoningMenuOwnsDataset, zoningMenuRow, zoningRow, zoningStylePanel } from './zoningDemo'

import type { HelloMapControl, HelloMapStage } from './helloMapDemo'
import type { PlaceKind, PlaceStage } from './placeDemo'
import type { DataPage, MeasureKind, PlatformTourActions, PlatformTourId, TourAvailability, Translate, ViewerChrome } from './platformTourTypes'
import type { PluginEntry, PluginTourEntries } from './usePluginTourEntries'
import type { ZoningMenuStage, ZoningStage } from './zoningDemo'
import type { SidebarTabType } from '../../../store/Menus/reducer'
import type { ViewerKey } from '../../../types/dbTypes'
import type { SettingsTabKey } from '../../settings/src/types'
import type { TourItem, TourStep, TourTarget } from '../tourTypes'

export interface SubTour {
  steps: TourStep[]
  /** Runs while the tour is open, for state every step needs, such as an open dialog; returns its undo. */
  setup?: () => () => void
}

type Icon = TourItem['icon']

const PANEL_TABS = Object.keys(SIDEBAR_TAB_META) as SidebarTabType[]

const MAP_CONTROLS = () => document.querySelector('.maplibregl-ctrl-top-right .maplibregl-ctrl-group')

const MAP_ATTRIBUTION = () => document.querySelector('.maplibregl-ctrl-attrib')

const VIEW_CUBE = () => document.querySelector('.cdt-view-cube')

const bimEmptyCard = (state: string) => () => document.querySelector(`[data-tour="bim-empty"][data-state="${state}"]`)

/** A hint on the BIM viewer's empty card, passed over unless the card is showing that state. */
const bimStateStep = (t: Translate, id: string, state: string): TourStep => ({
  ...step(t, id, bimEmptyCard(state), `bimState.${state}`),
  skip: () => !bimEmptyCard(state)(),
})

const DATASETS_TOOL = 'map-database'

type ItemEntry = [id: string, icon: Icon, onSelect?: () => void]

const items = (t: Translate, key: string, entries: ItemEntry[]) =>
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
  const ottawa = a.inOttawa()
  const key = toolId === 'map-measure' && !ottawa ? 'tools.map-measure.itemsAnywhere' : `tools.${toolId}.items`
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

const SHARE_DIALOGS = '[data-tour="share-qr-card"], [data-tour="share-screenshot-card"]'

const SHARE_TOOLS = ['map-share', 'bim-share']

const toolCard = (toolId: string) => () =>
  openToolPanel(toolId) ?? (SHARE_TOOLS.includes(toolId) ? document.querySelector(SHARE_DIALOGS) : null)

const openWhileShown = (toolId: string, leave: () => void) => () => {
  const cancel = afterMenusClose(() => setToolOpen(toolId, true))
  const stopWatching = onClosed(toolCard(toolId), leave)
  return () => {
    stopWatching()
    cancel()
    setToolOpen(toolId, false)
  }
}

const pluginToolStep = (t: Translate, tool: PluginEntry, a: PlatformTourActions): TourStep => ({
  id: toolStepId(tool.id),
  target: () => findToolTarget(tool.id),
  title: tool.label,
  body: t('tools.plugin.body'),
  scroll: false,
  onEnter: openWhileShown(tool.id, a.leave),
})

const shareDialogOr = (toolId: string) => (): Element | null =>
  document.querySelector(SHARE_DIALOGS) ?? findToolTarget(toolId)

function toolSteps(t: Translate, chrome: ViewerChrome, a: PlatformTourActions, plugins: PluginTourEntries): TourStep[] {
  const core = VIEWER_TOOLS[chrome].map(({ id }): TourStep => ({
    ...step(t, toolStepId(id), SHARE_TOOLS.includes(id) ? shareDialogOr(id) : () => findToolTarget(id), `tools.${id}`),
    scroll: false,
    items: toolItems(t, id, a),
    onEnter: id === DATASETS_TOOL ? undefined : openWhileShown(id, a.leave),
  }))
  return [...core, ...plugins.tools[chrome].map(tool => pluginToolStep(t, tool, a))]
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

const toolItem = (t: Translate, toolId: string, icon: Icon, onSelect: () => void): TourItem => ({
  id: toolId, icon, onSelect, term: t(`tools.${toolId}.title`), description: t(`tools.${toolId}.body`),
})

function toolbarStep(t: Translate, chrome: ViewerChrome, a: PlatformTourActions, plugins: PluginTourEntries): TourStep {
  const goTo = (toolId: string) => () => a.branch('tools', 'toolbar', toolStepId(toolId))
  return {
    ...step(t, 'toolbar', 'toolbar', `toolbar.${chrome}`),
    scroll: false,
    items: [
      ...VIEWER_TOOLS[chrome].map(tool => toolItem(t, tool.id, tool.icon, goTo(tool.id))),
      ...plugins.tools[chrome].map(tool => pluginItem(t('tools.plugin.body'), tool, goTo(tool.id))),
    ],
  }
}

function legendStep(t: Translate, a: PlatformTourActions): TourStep {
  return {
    ...withEntry(step(t, 'legend', TOUR_LEGEND_DEMO_TARGET, 'legend'), () => showTourDemo('legend')),
    scroll: false,
    items: items(t, 'legend.items', [['collapse', LR.ChevronUp, () => a.pressControl('legend-demo')], ['entries', LR.Palette], ['source', LR.Layers]]),
  }
}

const ZONING_STEPS: [stage: ZoningStage, target: TourTarget][] = [
  ['load', 'legend-applied'], ['legend', 'legend-applied'], ['layer', zoningRow], ['colour', zoningStylePanel], ['style', zoningStylePanel], ['remove', 'legend-applied'],
]

const holdDatasetsDialog = () => holdDemo('datasets-dialog', () => {
  setToolOpen(DATASETS_TOOL, true)
  return () => setToolOpen(DATASETS_TOOL, false)
})

const datasetsButton = () => findToolTarget(DATASETS_TOOL)

const datasetsDialogSteps = (t: Translate, a: PlatformTourActions): TourStep[] => [
  { ...withEntry(step(t, 'zoning-open', datasetsButton, 'zoningDemo.open'), holdFrom(DEMO_DELAY_MS, holdDatasetsDialog)), scroll: false },
  ...zoningMenuSteps(t, a, ZONING_MENU_STEPS.slice(0, 2)).map(s => ({ ...s, onEnter: allEntries(holdDatasetsDialog, s.onEnter) })),
  {
    ...withEntry(step(t, 'zoning-close', datasetsButton, 'zoningDemo.close'), allEntries(() => a.demoZoningMenu('close'), holdFor(DEMO_DELAY_MS, holdDatasetsDialog))),
    scroll: false,
  },
]

const zoningSteps = (t: Translate, a: PlatformTourActions): TourStep[] => [
  ...datasetsDialogSteps(t, a),
  ...ZONING_STEPS.map(([stage, target]): TourStep => ({
    ...withEntry(step(t, `zoning-${stage}`, target, `zoningDemo.${stage}`), () => a.demoZoning(stage)),
    scroll: false,
    skip: zoningLoadFailed,
  })),
  { ...legendStep(t, a), skip: () => !zoningLoadFailed() },
]

function viewerTour(t: Translate, chrome: ViewerChrome, a: PlatformTourActions, plugins: PluginTourEntries): SubTour {
  const ottawa = a.inOttawa()
  const searchDemo = ottawa && a.canDemoSearch()
  const zoningDemo = ottawa && !a.zoningApplied()
  return {
    steps: [
      withEntry(step(t, 'intro', null, `viewerTour.${chrome}`), () => a.openViewer(ViewerNames[chrome])),
      ...(chrome === 'map'
        ? [searchDemo ? withEntry(step(t, 'search', 'viewer-search', 'searchDemo'), a.demoSearch) : step(t, 'search', 'viewer-search', 'search.map')]
        : [step(t, 'search', 'viewer-search', 'search.bim'), bimStateStep(t, 'no-building', 'noBuilding'), bimStateStep(t, 'no-file', 'noBimFiles')]),
      ...panelSteps(t, chrome, a, plugins),
      toolbarStep(t, chrome, a, plugins),
      ...(chrome === 'map'
        ? [...mapControlSteps(t, a), { ...step(t, 'attribution', MAP_ATTRIBUTION), scroll: false }, ...(zoningDemo ? zoningSteps(t, a) : [legendStep(t, a)])]
        : [{ ...step(t, 'view-cube', VIEW_CUBE, 'viewCube'), scroll: false }]),
    ],
  }
}

function viewerChooser(t: Translate, available: TourAvailability, a: PlatformTourActions): SubTour {
  return {
    steps: [{
      ...step(t, 'choose', null, 'exploreViewers'),
      items: availableViewers(available).map(({ viewer, icon }) => item(t, 'viewers.items', viewer, icon, () => a.branch(viewer, 'choose'))),
    }],
  }
}

function dataChooser(t: Translate, available: TourAvailability, a: PlatformTourActions): SubTour {
  return {
    steps: [{
      ...step(t, 'choose', null, 'exploreData'),
      items: availableDataPages(available).map(({ page, icon }) => item(t, 'data.items', page, icon, () => a.branch(`data-${page}`, 'choose'))),
    }],
  }
}

const DATASET_COLLECTIONS: [id: string, icon: Icon, tab: string][] = [
  ['applied', LR.Layers, 'applied'], ['favourites', LR.Star, 'favourites'], ['organizational', LR.Building, 'organizational'],
  ['all', LR.Database, 'all'], ['national', LR.Flag, 'national'], ['subdivision', LR.Map, 'countrySubdivision'],
  ['municipal', LR.Building2, 'municipal'], ['liveData', LR.Radio, 'liveData'],
]

const ZONING_MENU_STEPS: [stage: ZoningMenuStage, target: string, skip?: () => boolean][] = [
  ['find', 'datasets-search'],
  ['apply', 'datasets-list', () => zoningMenuRow()?.dataset.state === 'checked'],
  ['applied', 'datasets-list', () => !zoningMenuRow()],
  ['remove', 'datasets-list', () => !zoningMenuOwnsDataset()],
]

const zoningMenuSteps = (t: Translate, a: PlatformTourActions, stages = ZONING_MENU_STEPS): TourStep[] => stages.map(([stage, target, skip]) => ({
  ...withEntry(step(t, `zoning-${stage}`, target, `datasetsTour.zoning.${stage}`), () => a.demoZoningMenu(stage)),
  skip,
}))

const datasetSearchEntries = (a: PlatformTourActions): ItemEntry[] => [
  ['search', LR.Search], ['filters', LR.ListFilter],
  ...(a.can('create', 'OpenDataPortal') ? [['addPortal', LR.Plus] satisfies ItemEntry] : []),
]

const DATASET_TAB_PICKERS = '[data-tour="datasets-tabs"], [data-tour="datasets-tab-select"]'

const shownDatasetTabs = () => [...document.querySelectorAll(DATASET_TAB_PICKERS)].find(picker => picker.getClientRects().length > 0) ?? null

function datasetsTour(t: Translate, a: PlatformTourActions): SubTour {
  const key = 'datasetsTour'
  const ottawa = a.inOttawa()
  return {
    setup: () => {
      setToolOpen(DATASETS_TOOL, true)
      const stopWatching = onClosed(() => findAnchor('datasets'), a.leave)
      return () => {
        stopWatching()
        restoreZoningSearch()
        setToolOpen(DATASETS_TOOL, false)
      }
    },
    steps: [
      { ...step(t, 'search', 'datasets-search', `${key}.search`), items: items(t, `${key}.search.items`, datasetSearchEntries(a)) },
      ...(ottawa ? zoningMenuSteps(t, a) : []),
      {
        ...step(t, 'tabs', shownDatasetTabs, `${key}.tabs`),
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
  const ottawa = a.inOttawa()
  const demo = (kind: MeasureKind): TourStep => ({
    ...withEntry(step(t, kind, MEASURE_REGION, ottawa ? `measureDemo.${kind}` : `measureDemo.anywhere.${kind}`), () => a.demoMeasure(kind, ottawa)),
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

/** A settings step inside a collapsible section, which it expands first; `demo` then changes a value until the step closes. */
function settingsStep(t: Translate, id: string, anchor: string, section: string, demo?: () => () => void): TourStep {
  return withEntry(step(t, id, anchor, `settingsTour.${id}`), () => {
    openSection(section)
    return demo?.()
  })
}

function mapSettingsSteps(t: Translate, a: PlatformTourActions): TourStep[] {
  return [
    {
      ...settingsStep(t, 'map-style', 'settings-map-style', 'settings-map', a.demoMapStyle),
      items: a.mapStyles.map(style => ({ id: style.url, icon: LR.Map, term: style.name, description: t('settingsTour.map-style.pick'), onSelect: () => a.setMapStyle(style.url) })),
    },
    settingsStep(t, 'terrain', 'settings-terrain', 'settings-map', () => demoTabs('settings-terrain')),
    settingsStep(t, 'projection', 'settings-projection', 'settings-map', () => demoTabs('settings-projection')),
    settingsStep(t, 'buildings', 'settings-buildings', 'settings-map', () => demoSwitch('settings-buildings')),
    settingsStep(t, 'measurements', 'settings-measurements', 'settings-measurements'),
    settingsStep(t, 'location', 'settings-location', 'settings-location'),
  ]
}

function bimSettingsSteps(t: Translate): TourStep[] {
  return [
    settingsStep(t, 'render-mode', 'settings-render-mode', 'settings-camera', () => demoTabs('settings-render-mode')),
    settingsStep(t, 'bim-projection', 'settings-bim-projection', 'settings-camera', () => demoTabs('settings-bim-projection')),
    settingsStep(t, 'navigation', 'settings-navigation', 'settings-camera'),
    settingsStep(t, 'grid', 'settings-grid', 'settings-grid', () => demoSwitch('settings-grid')),
    settingsStep(t, 'lighting', 'settings-lighting', 'settings-lighting'),
    settingsStep(t, 'bim-measurements', 'settings-bim-measurements', 'settings-bim-measurements'),
    settingsStep(t, 'point-clouds', 'settings-point-clouds', 'settings-point-clouds'),
  ]
}

const PLACE_STAGES: PlaceStage[] = ['add', 'place', 'delete']

function placeSteps(t: Translate, kind: PlaceKind, key: string, demo: (stage: PlaceStage, label: string) => () => void): TourStep[] {
  const label = t(`${key}.demo.label`)
  return PLACE_STAGES.map(stage => withEntry(
    step(t, `${kind}-${stage}`, stage === 'add' ? placeDialogTarget(kind) : placedTarget(kind), `${key}.${kind}-${stage}`),
    () => demo(stage, label),
  ))
}

const canPlace = (a: PlatformTourActions, subject: string) => a.can('create', subject) && a.can('delete', subject)

function panelTabSteps(t: Translate, tab: SidebarTabType, chrome: ViewerChrome, a: PlatformTourActions): TourStep[] {
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
        ...(chrome === 'map' && canPlace(a, 'Comment') ? placeSteps(t, 'comment', key, a.demoComment) : []),
      ]
    case 'sensors':
      return [
        { ...step(t, 'toolbar', 'panel-sensors-toolbar', `${key}.toolbar`), items: items(t, `${key}.toolbar.items`, [['search', LR.Search], ['visibility', LR.Eye], ['legend', LR.Palette], ['filters', LR.Funnel]]) },
        step(t, 'list', 'panel-sensors', `${key}.list`),
        ...(chrome === 'map' && canPlace(a, 'Sensor') && a.sensorTypesExist() ? placeSteps(t, 'sensor', key, a.demoSensor) : []),
      ]
    case 'settings':
      return chrome === 'map' ? mapSettingsSteps(t, a) : bimSettingsSteps(t)
  }
}

// Never aria-hidden: modal dialogs set it on the whole app while the panel stays open under them.
const shownPanel = () => {
  const panel = findAnchor('viewer-panel')
  return panel?.closest('[data-state="closed"]') ? null : panel
}

function panelTabTour(t: Translate, tab: SidebarTabType, chrome: ViewerChrome, a: PlatformTourActions): SubTour {
  return {
    setup: () => {
      const close = a.openPanel()
      a.selectPanelTab(tab)
      const stopWatching = onClosed(shownPanel, a.leave)
      return () => {
        stopWatching()
        close()
      }
    },
    steps: panelTabSteps(t, tab, chrome, a),
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

const canInstallPlugins = (a: PlatformTourActions) => a.can('create', 'PluginInstallation') || a.can('update', 'PluginInstallation')

const pluginTabs = (a: PlatformTourActions): ItemEntry[] => [
  ['all', LR.Blocks], ['running', LR.Play], ['installed', LR.PackageCheck],
  ...(canInstallPlugins(a) ? [['notInstalled', LR.PackagePlus] satisfies ItemEntry] : []),
]

function pluginsTour(t: Translate, a: PlatformTourActions): SubTour {
  const key = 'pluginsTour'
  return {
    steps: [
      {
        ...withEntry(step(t, 'tabs', 'plugins-tabs', `${key}.tabs`), () => a.openViewer(ViewerNames.plugins)),
        items: items(t, `${key}.tabs.items`, [
          ...pluginTabs(a).map(([tab, icon]): ItemEntry => [tab, icon, () => a.pressControl(`plugins-tab-${tab}`)]),
          ['search', LR.Search, () => a.pressControl('plugins-search')],
        ]),
      },
      {
        ...withEntry(step(t, 'list', 'plugins-list', `${key}.list`), () => a.pressControl('plugins-tab-all')),
        items: items(t, `${key}.list.items`, [['run', LR.Power], ['install', LR.Download], ['enable', LR.Building2], ['details', LR.ChevronRight]]),
      },
      ...helloMapSteps(t, a),
    ],
  }
}

const HELLO_MAP_CONTROLS: [id: HelloMapControl, icon: Icon, allowed: (a: PlatformTourActions) => boolean][] = [
  ['installed', LR.PackageCheck, canInstallPlugins],
  ['org-enabled', LR.Building2, a => a.can('update', 'PluginInstallation')],
  ['allow-override', LR.Users, a => a.can('update', 'PluginInstallation')],
  ['user-run', LR.Play, a => a.can('update', 'PluginUserSetting')],
]

function helloMapSteps(t: Translate, a: PlatformTourActions): TourStep[] {
  const key = 'pluginsTour.hello'
  const helloStep = (stage: HelloMapStage, target: TourTarget, skip: () => boolean): TourStep =>
    ({ ...withEntry(step(t, `hello-${stage}`, target, `${key}.${stage}`), () => a.demoHelloMap(stage)), skip })
  const controls = HELLO_MAP_CONTROLS.filter(([, , allowed]) => allowed(a))
  const controlsStep = (id: string, bodyKey: string, pressable: (control: HelloMapControl) => boolean, skip: () => boolean): TourStep => {
    const base = helloStep('controls', () => helloMapControl('plugin-controls'), skip)
    return {
      ...base,
      id,
      body: t(controls.length ? `${key}.${bodyKey}` : `${key}.controlsReadOnly`),
      items: controls.map(([control, icon]) =>
        item(t, `${key}.controls.items`, control, icon, pressable(control) ? () => a.toggleHelloMapControl(control) : undefined)),
    }
  }
  return [
    helloStep('open', 'plugin-row-hello-map', () => !helloMapRow()),
    helloStep('install', () => helloMapControl('plugin-install'), () => !canInstallPlugins(a) || !helloMapControl('plugin-install')),
    controlsStep('hello-controls', 'controls.body', () => true, () => !helloMapRow() || !helloMapInstalledByTour()),
    controlsStep('hello-controls-user', 'controlsUser', control => !isOrgControl(control), () => !helloMapRow() || helloMapInstalledByTour()),
    helloStep('uninstall', () => helloMapControl('plugin-installed'), () => !helloMapInstalledByTour()),
  ]
}

function settingsTour(t: Translate, a: PlatformTourActions): SubTour {
  return {
    steps: [
      {
        ...withEntry(step(t, 'sections', 'settings-sections', 'settingsPage.sections'), () => a.openViewer(ViewerNames.settings)),
        items: items(t, 'settingsPage.sections.items', SETTINGS_SECTIONS
          .filter(([key]) => canSeeSettingsTab(a.can, key))
          .map(([key, icon]): ItemEntry => [key, icon, a.isMobile() ? undefined : () => a.pressControl(`settings-tab-${key}`)])),
      },
      step(t, 'content', 'settings-content', 'settingsPage.content'),
    ],
  }
}

export const dataPageOf = (tour: PlatformTourId) => DATA_PAGES.find(({ page }) => tour === `data-${page}`)?.page

export const panelTabOf = (tour: PlatformTourId) => PANEL_TABS.find(tab => tour === `panel-${tab}`)

/** The closer tour an item opens; `viewer` picks the map or BIM version of a side panel tab or the toolbar. */
export function subTour(tour: Exclude<PlatformTourId, 'platform'>, t: Translate, a: PlatformTourActions, viewer?: ViewerKey, plugins = NO_PLUGIN_ENTRIES, available = EVERYTHING_AVAILABLE): SubTour {
  const page = dataPageOf(tour)
  const tab = panelTabOf(tour)
  const chrome = chromeOf(viewer) ?? 'map'
  if (page) return dataTour(t, page, a)
  if (tab) return panelTabTour(t, tab, chrome, a)
  if (tour === 'tools') return { steps: toolSteps(t, chrome, a, plugins) }
  if (tour === 'explore-viewers') return viewerChooser(t, available, a)
  if (tour === 'explore-data') return dataChooser(t, available, a)
  if (tour === 'settings') return settingsTour(t, a)
  if (tour === 'plugins') return pluginsTour(t, a)
  if (tour === 'datasets') return datasetsTour(t, a)
  if (tour === 'measure') return measureTour(t, a)
  return viewerTour(t, tour as ViewerChrome, a, plugins)
}
