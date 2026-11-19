// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

import en from '../../../i18n/messages/en.json'
import { Language, ViewerNames } from '../../../types/dbTypes'

import { DATA_PAGES, platformTourSteps } from './platformTourSteps'
import { PANEL_TABS, subTour } from './subTourSteps'

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
  'settings-point-clouds', 'legend-demo',
])

const SUB_TOURS: Exclude<PlatformTourId, 'platform'>[] = [
  'map', 'bim', 'tools', 'explore-viewers', 'explore-data', 'settings', 'plugins', 'datasets', 'measure',
  ...DATA_PAGES.map(({ page }) => `data-${page}` as const),
  ...PANEL_TABS.map(tab => `panel-${tab}` as const),
]

const echo = (key: string) => key

const actions = (): PlatformTourActions => ({
  can: () => true,
  branch: vi.fn(), openViewer: vi.fn(), openPanel: vi.fn(() => () => {}), selectPanelTab: vi.fn(),
  demoSearch: vi.fn(() => () => {}), demoMeasure: vi.fn(() => () => {}), pressControl: vi.fn(), openFeatureRequest: vi.fn(), openContactPage: vi.fn(), switchLanguage: vi.fn(), openBugReport: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn(), resetNorth: vi.fn(),
  mapStyles: [], setMapStyle: vi.fn(), demoMapStyle: vi.fn(() => () => {}),
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
    const ids = subTour('map', echo, actions()).steps.map(s => s.id)
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
    expect(a.demoMeasure).toHaveBeenCalledWith('distance')
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
    const a = actions()
    const legend = subTour('map', echo, a).steps.find(s => s.id === 'legend')
    legend?.items?.find(i => i.id === 'collapse')?.onSelect?.()
    expect(subTour('bim', echo, a).steps.map(s => s.id)).not.toContain('legend')
    expect(typeof legend?.onEnter?.()).toBe('function')
    expect(a.pressControl).toHaveBeenCalledWith('legend-demo')
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
})
