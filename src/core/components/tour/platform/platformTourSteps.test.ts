// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../../i18n/messages/en.json'
import { Language, ViewerNames } from '../../../types/dbTypes'
import { arcgisLayerUrl } from '../../viewers/map/datasets/src/arcgisLayer'

import { DATA_PAGES, platformTourSteps, toolStepId } from './platformTourSteps'
import { PANEL_TABS, subTour } from './subTourSteps'
import { ZONING_LAYER_URL } from './zoningDemo'

import type { PlatformTourActions, PlatformTourId, TourAvailability } from './platformTourTypes'
import type { TourStep } from '../tourTypes'

const ANCHORS = new Set([
  'sidebar', 'sidebar-interfaces', 'sidebar-viewers', 'viewer-search', 'viewer-panel-toggle', 'viewer-panel', 'toolbar',
  'sidebar-data', 'sidebar-plugins', 'sidebar-support', 'sidebar-account', 'map-settings',
  'data-title', 'data-filters', 'data-table', 'settings-sections', 'settings-content',
  'datasets-search', 'datasets-tabs', 'datasets-list', 'measure-demo-region', 'panel-search', 'panel-tab',
  'panel-file-sections', 'panel-layers-applied', 'panel-layers-available', 'panel-layers-drawings',
  'panel-layers-classifier', 'panel-comments', 'panel-sensors', 'panel-sensors-toolbar', 'plugins-tabs', 'plugins-list', 'sidebar-language',
  'settings-map-style', 'settings-terrain', 'settings-projection', 'settings-buildings', 'settings-measurements', 'settings-location',
  'settings-render-mode', 'settings-bim-projection', 'settings-navigation', 'settings-grid', 'settings-lighting', 'settings-bim-measurements',
  'settings-point-clouds', 'legend-demo', 'legend-applied', 'plugin-row-hello-map',
])

const SUB_TOURS: Exclude<PlatformTourId, 'platform'>[] = [
  'map', 'bim', 'tools', 'explore-viewers', 'explore-data', 'settings', 'plugins', 'datasets', 'measure',
  ...DATA_PAGES.map(({ page }) => `data-${page}` as const),
  ...PANEL_TABS.map(tab => `panel-${tab}` as const),
]

const echo = (key: string) => key

const actions = (): PlatformTourActions => ({
  can: () => true,
  inOttawa: () => true,
  canDemoSearch: () => true,
  zoningApplied: () => false,
  branch: vi.fn(), leave: vi.fn(), openViewer: vi.fn(), openPanel: vi.fn(() => () => {}), selectPanelTab: vi.fn(),
  demoSearch: vi.fn(() => () => {}), demoMeasure: vi.fn(() => () => {}), pressControl: vi.fn(), openFeatureRequest: vi.fn(), openContactPage: vi.fn(), switchLanguage: vi.fn(), openBugReport: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn(), resetNorth: vi.fn(),
  mapStyles: [], setMapStyle: vi.fn(), demoMapStyle: vi.fn(() => () => {}), demoZoning: vi.fn(() => () => {}), demoZoningMenu: vi.fn(() => () => {}),
  demoHelloMap: vi.fn(() => () => {}), toggleHelloMapControl: vi.fn(),
})

const resolve = (key: string) => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en.PlatformTour)

const allSteps = (): TourStep[] => [
  ...platformTourSteps(echo, actions(), { languages: [Language.En, Language.Fr, Language.Es] }),
  ...SUB_TOURS.flatMap(tour => [ViewerNames.map, ViewerNames.bim].flatMap(viewer => subTour(tour, echo, actions(), viewer).steps)),
]

describe('platformTourSteps', () => {
  it('walks the sidebar from welcome to a choice of closer tours', () => {
    const steps = platformTourSteps(echo, actions())
    expect(steps.map(s => s.id)).toEqual(['welcome', 'sidebar', 'interfaces', 'viewers', 'data', 'plugins', 'support', 'account', 'explore'])
  })

  it('folds in the tour of the page the viewer is on, with a shortcut to it from every overview card', () => {
    const a = actions()
    const section = { tour: 'bim' as const, label: 'Tour the BIM viewer', steps: subTour('bim', echo, a, ViewerNames.bim).steps }
    const steps = platformTourSteps(echo, a, { section })
    const ids = steps.map(s => s.id)
    steps.find(s => s.id === 'support')?.shortcut?.onSelect()
    expect(ids.slice(ids.indexOf('account') + 1)).toEqual(['intro', 'search', 'no-building', 'no-file', 'panel-toggle', 'panel', 'toolbar', 'view-cube', 'explore'])
    expect(steps.filter(s => s.shortcut?.label === 'Tour the BIM viewer').map(s => s.id)).toEqual([...ids.slice(0, ids.indexOf('account') + 1), 'explore'])
    expect(a.branch).toHaveBeenCalledWith('bim', 'support')
  })

  it('offers only the viewers and data pages the organization has', () => {
    const a = actions()
    const available: TourAvailability = { viewers: ['map'], dataPages: ['sites', 'buildings'] }
    const steps = platformTourSteps(echo, a, { available })
    const ids = (stepId: string) => steps.find(s => s.id === stepId)?.items?.map(i => i.id)
    steps.find(s => s.id === 'explore')?.items?.forEach(i => i.onSelect?.())
    expect(ids('viewers')).toEqual(['map'])
    expect(ids('data')).toEqual(['sites', 'buildings'])
    expect(a.branch).toHaveBeenNthCalledWith(1, 'map', 'explore')
    expect(a.branch).toHaveBeenNthCalledWith(2, 'explore-data', 'explore')
  })

  it('opens the tour of a viewer or data page from its row, returning to the step it left', () => {
    const a = actions()
    const steps = platformTourSteps(echo, a)
    steps.find(s => s.id === 'viewers')?.items?.find(i => i.id === 'bim')?.onSelect?.()
    steps.find(s => s.id === 'data')?.items?.find(i => i.id === 'files')?.onSelect?.()
    expect(a.branch).toHaveBeenNthCalledWith(1, 'bim', 'viewers')
    expect(a.branch).toHaveBeenNthCalledWith(2, 'data-files', 'data')
  })

  it('leaves out the data pages when the organization has none', () => {
    const ids = platformTourSteps(echo, actions(), { available: { viewers: ['map', 'bim'], dataPages: [] } }).map(s => s.id)
    expect(ids).not.toContain('interfaces')
    expect(ids).not.toContain('data')
  })

  it('asks which viewer or data page to tour, from what the organization has', () => {
    const a = actions()
    const available: TourAvailability = { viewers: ['map', 'bim'], dataPages: ['files'] }
    const viewers = subTour('explore-viewers', echo, a, undefined, undefined, available).steps[0].items
    const pages = subTour('explore-data', echo, a, undefined, undefined, available).steps[0].items
    viewers?.find(i => i.id === 'bim')?.onSelect?.()
    expect(pages?.map(i => i.id)).toEqual(['files'])
    expect(a.branch).toHaveBeenCalledWith('bim', 'choose')
  })

  it('points every step at a known anchor, a tool, a function or the centre of the screen', () => {
    for (const step of allSteps()) {
      const { target } = step
      const known = target === null || typeof target === 'function' || ANCHORS.has(target) || target.startsWith('tool-')
      expect(known, step.id).toBe(true)
    }
  })

  it('has English text for every key it asks for', () => {
    for (const step of allSteps()) {
      const texts = [step.title, ...(typeof step.body === 'string' ? step.body.split('\n') : []), ...(step.items ?? []).flatMap(i => [i.term, i.description])]
      for (const key of texts) {
        expect(typeof resolve(key), key).toBe('string')
      }
    }
  })
})

describe('subTourSteps', () => {
  it('covers the toolbar tools and side panel tabs plugins add', () => {
    const a = actions()
    const plugins = {
      tools: { map: [{ id: 'plugin:solar:shade', label: 'Shade study', icon: undefined }], bim: [] },
      tabs: { map: [{ id: 'plugin:solar:panel' as const, label: 'Solar', icon: undefined }], bim: [] },
    }
    const steps = subTour('map', echo, a, ViewerNames.map, plugins).steps
    const toolbar = steps.find(s => s.id === 'toolbar')?.items?.map(i => i.term)
    steps.find(s => s.id === 'panel')?.items?.find(i => i.term === 'Solar')?.onSelect?.()
    expect(toolbar).toContain('Shade study')
    expect(subTour('tools', echo, a, ViewerNames.map, plugins).steps.at(-1)?.id).toBe('tool-plugin:solar:shade')
    expect(a.selectPanelTab).toHaveBeenCalledWith('plugin:solar:panel')
  })

  it('shows a role only the settings, Add options and panel tabs it can use', () => {
    const a = { ...actions(), can: (action: string, subject: string) => action === 'read' && subject === 'File' }
    const map = subTour('map', echo, a).steps
    const ids = (stepId: string, steps = map) => steps.find(s => s.id === stepId)?.items?.map(i => i.id)
    expect(ids('sections', subTour('settings', echo, a).steps)).toEqual(['account'])
    expect(ids('tool-map-add', subTour('tools', echo, a).steps)).toEqual([])
    expect(ids('panel')).toEqual(['file', 'layers', 'settings'])
    expect(ids('search', subTour('datasets', echo, a).steps)).toEqual(['search', 'filters'])
  })

  it('adds a language step before support only for an organization with several languages', () => {
    const a = actions()
    const ids = (languages: Language[]) => platformTourSteps(echo, a, { languages }).map(s => s.id)
    expect(ids([Language.En])).not.toContain('language')
    const steps = platformTourSteps(echo, a, { languages: [Language.En, Language.Fr] })
    const language = steps.find(s => s.id === 'language')
    expect(steps.indexOf(language!) + 1).toBe(steps.findIndex(s => s.id === 'support'))
    language?.items?.find(i => i.id === Language.Fr)?.onSelect?.()
    expect(a.switchLanguage).toHaveBeenCalledWith(Language.Fr)
  })

  it('switches the datasets dialog to a collection from its row', () => {
    const a = actions()
    subTour('datasets', echo, a).steps.find(s => s.id === 'tabs')?.items?.find(i => i.id === 'subdivision')?.onSelect?.()
    expect(a.pressControl).toHaveBeenCalledWith('datasets-tab-countrySubdivision')
  })

  it('switches the plugins page to a list from its row', () => {
    const a = actions()
    const tabs = subTour('plugins', echo, a).steps.find(s => s.id === 'tabs')
    tabs?.items?.find(i => i.id === 'running')?.onSelect?.()
    tabs?.items?.find(i => i.id === 'search')?.onSelect?.()
    expect(a.pressControl).toHaveBeenCalledWith('plugins-tab-running')
    expect(a.pressControl).toHaveBeenCalledWith('plugins-search')
  })

  it('offers the not-installed list only to people who can install plugins', () => {
    const tabIds = (a: PlatformTourActions) => subTour('plugins', echo, a).steps.find(s => s.id === 'tabs')?.items?.map(i => i.id)
    expect(tabIds(actions())).toContain('notInstalled')
    expect(tabIds({ ...actions(), can: () => false })).not.toContain('notInstalled')
  })

  it('skips the Hello Map steps when its row is not on the page', () => {
    document.body.innerHTML = ''
    const steps = subTour('plugins', echo, actions()).steps
    const skipped = ['hello-open', 'hello-install', 'hello-controls'].map(id => steps.find(s => s.id === id)?.skip?.())
    expect(skipped).toEqual([true, true, true])
  })

  it('offers each Hello Map control only to a role that can use it', () => {
    const a = { ...actions(), can: (_: string, subject: string) => subject === 'PluginUserSetting' }
    const controls = subTour('plugins', echo, a).steps.find(s => s.id === 'hello-controls')
    controls?.items?.[0]?.onSelect?.()
    expect(controls?.items?.map(i => i.id)).toEqual(['user-run'])
    expect(a.toggleHelloMapControl).toHaveBeenCalledWith('user-run')
  })

  it('runs each Hello Map stage while its step shows, after listing every plugin', () => {
    const a = actions()
    const steps = subTour('plugins', echo, a).steps
    steps.forEach(s => s.onEnter?.())
    expect(steps.map(s => s.id)).toEqual(['tabs', 'list', 'hello-open', 'hello-install', 'hello-controls', 'hello-uninstall'])
    expect(a.pressControl).toHaveBeenCalledWith('plugins-tab-all')
    expect(vi.mocked(a.demoHelloMap).mock.calls.map(([stage]) => stage)).toEqual(['open', 'install', 'controls', 'uninstall'])
  })

  it('explains the read-only summary when the role has no Hello Map control', () => {
    const controls = subTour('plugins', echo, { ...actions(), can: () => false }).steps.find(s => s.id === 'hello-controls')
    expect(controls?.items).toEqual([])
    expect(controls?.body).toBe('pluginsTour.hello.controlsReadOnly')
  })

  it('gives every overview step that leads somewhere a button to go there', () => {
    const a = actions()
    const steps = platformTourSteps(echo, a)
    for (const id of ['viewers', 'data', 'plugins', 'support', 'account', 'explore']) {
      expect(steps.find(s => s.id === id)?.items?.some(i => i.onSelect), id).toBe(true)
    }
  })

  it('opens the page it covers when its first step opens', () => {
    const a = actions()
    subTour('data-buildings', echo, a).steps[0].onEnter?.()
    subTour('bim', echo, a).steps[0].onEnter?.()
    expect(a.openViewer).toHaveBeenNthCalledWith(1, ViewerNames.buildings)
    expect(a.openViewer).toHaveBeenNthCalledWith(2, ViewerNames.bim)
  })

  it('gives the map tour the search demo, side panel, toolbar, map controls, attribution and legend', () => {
    const ids = subTour('map', echo, { ...actions(), inOttawa: () => false }).steps.map(s => s.id)
    expect(ids).toEqual(['intro', 'search', 'panel-toggle', 'panel', 'toolbar', 'navigation', 'map-settings', 'attribution', 'legend'])
  })

  it('branches from the toolbar step into the tour of the tool picked', () => {
    const a = actions()
    subTour('map', echo, a).steps.find(s => s.id === 'toolbar')?.items?.find(i => i.id === 'map-measure')?.onSelect?.()
    expect(a.branch).toHaveBeenCalledWith('tools', 'toolbar', 'tool-map-measure')
    expect(subTour('tools', echo, a, ViewerNames.bim).steps.map(s => s.id)).toContain('tool-bim-clipping')
  })

  it('branches into a tour of a side panel tab from the panel step', () => {
    const a = actions()
    subTour('map', echo, a).steps.find(s => s.id === 'panel')?.items?.find(i => i.id === 'layers')?.onSelect?.()
    expect(a.branch).toHaveBeenCalledWith('panel-layers', 'panel')
  })

  it('opens the side panel on the chosen tab for as long as a tab tour runs', () => {
    const a = actions()
    const close = vi.fn()
    a.openPanel = vi.fn(() => close)
    const undo = subTour('panel-sensors', echo, a, ViewerNames.map).setup?.()
    expect(a.selectPanelTab).toHaveBeenCalledWith('sensors')
    undo?.()
    expect(close).toHaveBeenCalledOnce()
  })

  it('shows the map or BIM version of a side panel tab', () => {
    const ids = (viewer: string) => subTour('panel-layers', echo, actions(), viewer as never).steps.map(s => s.id)
    expect(ids(ViewerNames.map)).toEqual(['search', 'applied', 'available'])
    expect(ids(ViewerNames.bim)).toEqual(['search', 'drawings', 'classifier'])
  })

  it('demonstrates measuring from the measure tool, and runs the real share options', () => {
    const a = actions()
    const steps = subTour('tools', echo, a).steps
    steps.find(s => s.id === 'tool-map-measure')?.items?.find(i => i.id === 'area')?.onSelect?.()
    steps.find(s => s.id === 'tool-map-share')?.items?.find(i => i.id === 'copy')?.onSelect?.()
    expect(a.branch).toHaveBeenCalledWith('measure', 'tool-map-measure', 'area')
    expect(a.pressControl).toHaveBeenCalledWith('share-copy')
    subTour('measure', echo, a).steps[0].onEnter?.()
    expect(a.demoMeasure).toHaveBeenCalledWith('distance', true)
  })

  it('spotlights the QR dialog while it is open', () => {
    const toolbar = document.createElement('div')
    toolbar.dataset.tour = 'tool-map-share'
    document.body.append(toolbar)
    const target = () => {
      const t = subTour('tools', echo, actions()).steps.find(s => s.id === 'tool-map-share')?.target
      return typeof t === 'function' ? t() : t
    }
    const fallback = target()
    const qr = document.createElement('div')
    qr.dataset.tour = 'share-qr-card'
    document.body.append(qr)
    expect(target()).toBe(qr)
    qr.remove()
    expect(target()).toBe(fallback)
    toolbar.remove()
  })

  it('hints at the BIM viewer\'s empty card only while it shows that state', () => {
    const steps = subTour('bim', echo, actions()).steps
    const skipped = () => ['no-building', 'no-file'].map(id => steps.find(s => s.id === id)?.skip?.())
    expect(skipped()).toEqual([true, true])
    document.body.innerHTML = '<div data-tour="bim-empty" data-state="noBimFiles"></div>'
    expect(skipped()).toEqual([true, false])
    document.body.innerHTML = ''
  })

  it('gives the legend to the map only, opening the example legend while it shows', () => {
    const a = { ...actions(), inOttawa: () => false }
    const legend = subTour('map', echo, a).steps.find(s => s.id === 'legend')
    legend?.items?.find(i => i.id === 'collapse')?.onSelect?.()
    expect(subTour('bim', echo, a).steps.map(s => s.id)).not.toContain('legend')
    expect(typeof legend?.onEnter?.()).toBe('function')
    expect(a.pressControl).toHaveBeenCalledWith('legend-demo')
  })

  it('shows the zoning steps in Ottawa and the example legend elsewhere', () => {
    const ids = (ottawa: boolean) => subTour('map', echo, { ...actions(), inOttawa: () => ottawa }).steps.map(s => s.id).slice(ottawa ? -6 : -4)
    expect(ids(true)).toEqual(['zoning-load', 'zoning-legend', 'zoning-layer', 'zoning-colour', 'zoning-style', 'zoning-remove'])
    expect(ids(false)).toEqual(['navigation', 'map-settings', 'attribution', 'legend'])
  })

  it('runs each zoning stage while its step shows, pointing at the applied layers and the zoning layer\'s style panel', () => {
    const zoningId = `url-arcgis:${arcgisLayerUrl(ZONING_LAYER_URL)}`
    document.body.innerHTML = `
      <li data-tour="dataset-row:other"><div data-tour="dataset-style-panel" id="other"></div></li>
      <li id="zoning" data-tour="dataset-row:${zoningId}"><div data-tour="dataset-style-panel" id="zoning-panel"></div></li>`
    const a = actions()
    const steps = subTour('map', echo, a).steps.filter(s => s.id.startsWith('zoning-'))
    steps.forEach(s => s.onEnter?.())
    const resolved = steps.map(s => (typeof s.target === 'function' ? (s.target() as Element | null)?.id : s.target))
    document.body.innerHTML = ''
    expect(resolved).toEqual(['legend-applied', 'legend-applied', 'zoning', 'zoning-panel', 'zoning-panel', 'legend-applied'])
    expect(steps.every(s => s.scroll === false)).toBe(true)
    expect(vi.mocked(a.demoZoning).mock.calls.map(([stage]) => stage)).toEqual(['load', 'legend', 'layer', 'colour', 'style', 'remove'])
  })

  it('shows the example legend instead of the zoning steps when the zoning map is already applied', () => {
    const ids = subTour('map', echo, { ...actions(), zoningApplied: () => true }).steps.map(s => s.id)
    expect(ids.slice(-1)).toEqual(['legend'])
    expect(ids.some(id => id.startsWith('zoning-'))).toBe(false)
  })

  it('types the Carleton search only for an organization with a geocoder', () => {
    const search = (canDemoSearch: boolean) => subTour('map', echo, { ...actions(), canDemoSearch: () => canDemoSearch }).steps.find(s => s.id === 'search')
    expect(search(true)?.onEnter).toBeDefined()
    expect(search(false)?.onEnter).toBeUndefined()
    expect(search(false)?.body).toBe('search.map.body')
  })

  it('points the Hello Map steps at its own row when another plugin row is open above it', () => {
    const controls = (id: string) => `<div data-tour="plugin-controls" id="${id}-controls"><div data-tour="plugin-installed" id="${id}-installed"></div></div><button data-tour="plugin-install" id="${id}-install"></button>`
    document.body.innerHTML = `
      <li data-tour="plugin-row-other">${controls('other')}</li>
      <li data-tour="plugin-row-hello-map">${controls('hello')}</li>`
    const steps = subTour('plugins', echo, actions()).steps
    const resolved = ['hello-install', 'hello-controls', 'hello-uninstall'].map(id => {
      const target = steps.find(s => s.id === id)?.target
      return typeof target === 'function' ? (target() as Element | null)?.id : target
    })
    document.body.innerHTML = ''
    expect(resolved).toEqual(['hello-install', 'hello-controls', 'hello-installed'])
  })

  it('adds the zoning search steps to the datasets tour only in Ottawa', () => {
    const ids = (ottawa: boolean) => subTour('datasets', echo, { ...actions(), inOttawa: () => ottawa }).steps.map(s => s.id)
    expect(ids(true)).toEqual(['search', 'zoning-find', 'zoning-apply', 'zoning-applied', 'zoning-remove', 'tabs', 'list'])
    expect(ids(false)).toEqual(['search', 'tabs', 'list'])
    const a = actions()
    subTour('datasets', echo, a).steps.forEach(s => s.onEnter?.())
    expect(vi.mocked(a.demoZoningMenu).mock.calls.map(([stage]) => stage)).toEqual(['find', 'apply', 'applied', 'remove'])
  })

  it('walks the map settings one control at a time, demonstrating the map style and offering each one', () => {
    const a = { ...actions(), mapStyles: [{ name: 'Satellite', url: 'sat' }, { name: 'Streets', url: 'streets' }] }
    const steps = subTour('panel-settings', echo, a, ViewerNames.map).steps
    const style = steps[0]
    style.onEnter?.()
    style.items?.find(i => i.term === 'Streets')?.onSelect?.()
    expect(steps.map(s => s.id)).toEqual(['map-style', 'terrain', 'projection', 'buildings', 'measurements', 'location'])
    expect(a.demoMapStyle).toHaveBeenCalledOnce()
    expect(a.setMapStyle).toHaveBeenCalledWith('streets')
  })

  it('walks the BIM settings one control at a time', () => {
    const ids = subTour('panel-settings', echo, actions(), ViewerNames.bim).steps.map(s => s.id)
    expect(ids).toEqual(['render-mode', 'bim-projection', 'navigation', 'grid', 'lighting', 'bim-measurements', 'point-clouds'])
  })

  it('passes the same place decision to the measure demo as its copy', () => {
    for (const ottawa of [false, true]) {
      const a = { ...actions(), inOttawa: () => ottawa }
      subTour('measure', echo, a).steps[0].onEnter?.()
      expect(a.demoMeasure).toHaveBeenCalledWith('distance', ottawa)
    }
  })

  it('keeps Ottawa content out for other places', () => {
    const a = { ...actions(), inOttawa: () => false }
    const search = subTour('map', echo, a, ViewerNames.map).steps.find(s => s.id === 'search')
    const measure = subTour('measure', echo, a).steps
    const tool = subTour('tools', echo, a, ViewerNames.map).steps.find(s => s.id === toolStepId('map-measure'))
    expect(search?.onEnter).toBeUndefined()
    expect(search?.body).toBe('search.map.body')
    expect(measure.map(s => s.body)).toEqual(['measureDemo.anywhere.distance.body', 'measureDemo.anywhere.area.body'])
    expect(tool?.items?.map(i => i.description)).toEqual([
      'tools.map-measure.itemsAnywhere.distance.description',
      'tools.map-measure.itemsAnywhere.area.description',
      'tools.map-measure.itemsAnywhere.clear.description',
    ])
  })
})

describe('closing a card the tour opened', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16))
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  const frames = (n = 10) => vi.advanceTimersByTime(16 * n)

  it('leaves the datasets tour when the person closes the dialog, not when the tour does', () => {
    document.body.innerHTML = '<div data-tour="datasets"></div>'
    const a = actions()
    const undo = subTour('datasets', echo, a).setup?.()
    frames()
    document.querySelector('[data-tour="datasets"]')?.remove()
    frames()
    expect(a.leave).toHaveBeenCalledOnce()

    document.body.innerHTML = '<div data-tour="datasets"></div>'
    const b = actions()
    const undoB = subTour('datasets', echo, b).setup?.()
    frames()
    undoB?.()
    document.querySelector('[data-tour="datasets"]')?.remove()
    frames()
    expect(b.leave).not.toHaveBeenCalled()
    undo?.()
  })

  it('leaves a side panel tab tour when the person closes the panel, not when the tour does', () => {
    document.body.innerHTML = '<div data-tour="viewer-panel"></div>'
    const a = actions()
    const undo = subTour('panel-sensors', echo, a, ViewerNames.map).setup?.()
    frames()
    undo?.()
    document.querySelector('[data-tour="viewer-panel"]')?.remove()
    frames()
    expect(a.leave).not.toHaveBeenCalled()

    document.body.innerHTML = '<div data-tour="viewer-panel"></div>'
    const live = subTour('panel-sensors', echo, a, ViewerNames.map).setup?.()
    frames()
    document.querySelector('[data-tour="viewer-panel"]')?.remove()
    frames()
    expect(a.leave).toHaveBeenCalledOnce()
    live?.()
  })

  const openTool = (id: string) => {
    document.body.innerHTML = `<div data-tour="tool-${id}"><button aria-expanded="true" aria-controls="card"></button></div><div id="card"></div>`
  }

  it('leaves the tools tour when the person closes the open tool card, not when the step does', () => {
    openTool('map-add')
    const a = actions()
    const step = subTour('tools', echo, a, ViewerNames.map).steps.find(s => s.id === toolStepId('map-add'))
    const undo = step?.onEnter?.()
    frames()
    document.getElementById('card')?.remove()
    frames()
    expect(a.leave).toHaveBeenCalledOnce()
    undo?.()

    openTool('map-add')
    const b = actions()
    const undoB = subTour('tools', echo, b, ViewerNames.map).steps.find(s => s.id === toolStepId('map-add'))?.onEnter?.()
    frames()
    undoB?.()
    document.getElementById('card')?.remove()
    frames()
    expect(b.leave).not.toHaveBeenCalled()
  })

  it('treats an open share dialog as the share dropdown still being open', () => {
    openTool('map-share')
    const a = actions()
    const undo = subTour('tools', echo, a, ViewerNames.map).steps.find(s => s.id === toolStepId('map-share'))?.onEnter?.()
    frames()
    document.getElementById('card')?.remove()
    document.body.insertAdjacentHTML('beforeend', '<div data-tour="share-qr-card"></div>')
    frames()
    expect(a.leave).not.toHaveBeenCalled()
    document.querySelector('[data-tour="share-qr-card"]')?.remove()
    frames()
    expect(a.leave).toHaveBeenCalledOnce()
    undo?.()
  })
})
