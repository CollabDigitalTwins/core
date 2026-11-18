// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

import en from '../../../i18n/messages/en.json'
import { Language, ViewerNames } from '../../../types/dbTypes'

import { DATA_PAGES, platformTourSteps } from './platformTourSteps'
import { PANEL_TABS, subTour } from './subTourSteps'

import type { PlatformTourActions, PlatformTourId } from './platformTourTypes'
import type { TourStep } from '../tourTypes'

const ANCHORS = new Set([
  'sidebar', 'sidebar-viewers', 'viewer-search', 'viewer-panel-toggle', 'viewer-panel', 'toolbar',
  'sidebar-data', 'sidebar-plugins', 'sidebar-support', 'sidebar-account', 'map-settings',
  'data-title', 'data-filters', 'data-table', 'settings-sections', 'settings-content',
  'datasets-search', 'datasets-tabs', 'datasets-list', 'measure-demo-region', 'panel-search', 'panel-tab',
  'panel-file-sections', 'panel-layers-applied', 'panel-layers-available', 'panel-layers-drawings',
  'panel-layers-classifier', 'panel-comments', 'panel-sensors', 'panel-sensors-toolbar', 'plugins-tabs', 'plugins-list', 'sidebar-language',
])

const SUB_TOURS: Exclude<PlatformTourId, 'platform'>[] = [
  'map', 'bim', 'settings', 'plugins', 'datasets', 'measure',
  ...DATA_PAGES.map(({ page }) => `data-${page}` as const),
  ...PANEL_TABS.map(tab => `panel-${tab}` as const),
]

const echo = (key: string) => key

const actions = (): PlatformTourActions => ({
  can: () => true,
  branch: vi.fn(), openViewer: vi.fn(), openPanel: vi.fn(() => () => {}), selectPanelTab: vi.fn(),
  demoSearch: vi.fn(() => () => {}), demoMeasure: vi.fn(() => () => {}), pressControl: vi.fn(), openFeatureRequest: vi.fn(), emailTeam: vi.fn(), switchLanguage: vi.fn(), openBugReport: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn(), resetNorth: vi.fn(),
})

const resolve = (key: string) => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en.PlatformTour)

const allSteps = (): TourStep[] => [
  ...[ViewerNames.map, ViewerNames.bim, ViewerNames.sites].flatMap(viewer => platformTourSteps(viewer, echo, actions(), undefined, [Language.En, Language.Fr, Language.Es])),
  ...SUB_TOURS.flatMap(tour => [ViewerNames.map, ViewerNames.bim].flatMap(viewer => subTour(tour, echo, actions(), viewer).steps)),
]

describe('platformTourSteps', () => {
  it('walks the map viewer from welcome to done, map text on the viewer steps', () => {
    const steps = platformTourSteps(ViewerNames.map, echo, actions())
    expect(steps.map(s => s.id)).toEqual(['welcome', 'sidebar', 'viewers', 'search', 'panel', 'toolbar', 'data', 'plugins', 'support', 'account', 'done'])
    expect(steps.find(s => s.id === 'toolbar')?.title).toBe('toolbar.map.title')
  })

  it('drops the viewer steps on a data page, which has no search, panel or toolbar', () => {
    const ids = platformTourSteps(ViewerNames.files, echo, actions()).map(s => s.id)
    expect(ids).not.toContain('search')
    expect(ids).not.toContain('toolbar')
    expect(ids).toHaveLength(8)
  })

  it('branches into a closer tour from an item, returning to the step it left', () => {
    const a = actions()
    const steps = platformTourSteps(ViewerNames.map, echo, a)
    steps.find(s => s.id === 'viewers')?.items?.find(i => i.id === 'bim')?.onSelect?.()
    steps.find(s => s.id === 'toolbar')?.items?.find(i => i.id === 'map-measure')?.onSelect?.()
    expect(a.branch).toHaveBeenNthCalledWith(1, 'bim', 'viewers')
    expect(a.branch).toHaveBeenNthCalledWith(2, 'map', 'toolbar', 'tool-map-measure')
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
    const overviewTools = platformTourSteps(ViewerNames.map, echo, a, plugins).find(s => s.id === 'toolbar')?.items?.map(i => i.term)
    const steps = subTour('map', echo, a, ViewerNames.map, plugins).steps
    steps.find(s => s.id === 'panel')?.items?.find(i => i.term === 'Solar')?.onSelect?.()
    expect(overviewTools).toContain('Shade study')
    expect(steps.at(-1)?.id).toBe('tool-plugin:solar:shade')
    expect(a.selectPanelTab).toHaveBeenCalledWith('plugin:solar:panel')
  })

  it('shows a role only the settings, Add options and panel tabs it can use', () => {
    const a = { ...actions(), can: (action: string, subject: string) => action === 'read' && subject === 'File' }
    const map = subTour('map', echo, a).steps
    const ids = (stepId: string, steps = map) => steps.find(s => s.id === stepId)?.items?.map(i => i.id)
    expect(ids('sections', subTour('settings', echo, a).steps)).toEqual(['account'])
    expect(ids('tool-map-add')).toEqual([])
    expect(ids('panel')).toEqual(['file', 'layers', 'settings'])
    expect(ids('search', subTour('datasets', echo, a).steps)).toEqual(['search', 'filters'])
  })

  it('adds a language step before support only for an organization with several languages', () => {
    const a = actions()
    const ids = (languages: Language[]) => platformTourSteps(ViewerNames.map, echo, a, undefined, languages).map(s => s.id)
    expect(ids([Language.En])).not.toContain('language')
    const steps = platformTourSteps(ViewerNames.map, echo, a, undefined, [Language.En, Language.Fr])
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

  it('gives every overview step that leads somewhere a button to go there', () => {
    const a = actions()
    const steps = platformTourSteps(ViewerNames.map, echo, a)
    for (const id of ['viewers', 'search', 'panel', 'toolbar', 'data', 'plugins', 'support', 'account']) {
      expect(steps.find(s => s.id === id)?.items?.some(i => i.onSelect), id).toBe(true)
    }
    steps.find(s => s.id === 'panel')?.items?.[0].onSelect?.()
    expect(a.branch).toHaveBeenCalledWith('map', 'panel', 'panel')
  })

  it('opens the page it covers when its first step opens', () => {
    const a = actions()
    subTour('data-buildings', echo, a).steps[0].onEnter?.()
    subTour('bim', echo, a).steps[0].onEnter?.()
    expect(a.openViewer).toHaveBeenNthCalledWith(1, ViewerNames.buildings)
    expect(a.openViewer).toHaveBeenNthCalledWith(2, ViewerNames.bim)
  })

  it('gives the map tour a step for the search demo, the side panel, the map controls and each tool', () => {
    const ids = subTour('map', echo, actions()).steps.map(s => s.id)
    expect(ids).toEqual(['intro', 'search', 'panel-toggle', 'panel', 'navigation', 'map-settings',
      'tool-map-compare', 'tool-map-database', 'tool-map-add', 'tool-map-measure', 'tool-map-share'])
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
    const steps = subTour('map', echo, a).steps
    steps.find(s => s.id === 'tool-map-measure')?.items?.find(i => i.id === 'area')?.onSelect?.()
    steps.find(s => s.id === 'tool-map-share')?.items?.find(i => i.id === 'copy')?.onSelect?.()
    expect(a.branch).toHaveBeenCalledWith('measure', 'tool-map-measure', 'area')
    expect(a.pressControl).toHaveBeenCalledWith('share-copy')
    subTour('measure', echo, a).steps[0].onEnter?.()
    expect(a.demoMeasure).toHaveBeenCalledWith('distance')
  })
})
