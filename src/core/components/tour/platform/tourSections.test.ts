// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

import { ViewerNames } from '../../../types/dbTypes'

import { EVERYTHING_AVAILABLE } from './platformTourSteps'
import { pageOfTour, tourSections } from './tourSections'
import { NO_PLUGIN_ENTRIES } from './usePluginTourEntries'

import type { PlatformTourActions } from './platformTourTypes'
import type { SectionContext } from './tourSections'
import type { ViewerKey } from '../../../types/dbTypes'

const echo = (key: string) => key

const actions = (can = () => true): PlatformTourActions => ({
  can,
  inOttawa: () => false,
  canDemoSearch: () => false,
  zoningApplied: () => false,
  isMobile: () => false,
  branch: vi.fn(), leave: vi.fn(), openViewer: vi.fn(), openMenu: vi.fn(() => () => {}), openPanel: vi.fn(() => () => {}), selectPanelTab: vi.fn(),
  demoSearch: vi.fn(() => () => {}), demoMeasure: vi.fn(() => () => {}), pressControl: vi.fn(), openFeatureRequest: vi.fn(), openContactPage: vi.fn(), switchLanguage: vi.fn(), openBugReport: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn(), resetNorth: vi.fn(),
  mapStyles: [], setMapStyle: vi.fn(), demoMapStyle: vi.fn(() => () => {}), demoZoning: vi.fn(() => () => {}), demoZoningMenu: vi.fn(() => () => {}),
  demoHelloMap: vi.fn(() => () => {}), toggleHelloMapControl: vi.fn(),
  sensorTypesExist: () => true, demoComment: vi.fn(() => () => {}), demoSensor: vi.fn(() => () => {}),
})

const context = (viewer: ViewerKey | undefined, overrides: Partial<SectionContext> = {}): SectionContext => ({
  t: echo, a: actions(), viewer, plugins: NO_PLUGIN_ENTRIES, available: EVERYTHING_AVAILABLE, languages: [], ...overrides,
})

const ids = (viewer: ViewerKey | undefined, overrides?: Partial<SectionContext>) =>
  tourSections(context(viewer, overrides), vi.fn()).map(section => section.id)

const PAGE_TOURS = ['map', 'bim', 'data-sites', 'data-buildings', 'data-files', 'data-infrastructure', 'plugins', 'settings']

describe('tourSections', () => {
  it('lists the overview and every page tour, with the map closer tours right after the map on the map', () => {
    expect(ids(ViewerNames.map)).toEqual([
      'platform', 'map', 'tools', 'datasets', 'measure',
      'panel-file', 'panel-layers', 'panel-communication', 'panel-sensors', 'panel-settings',
      ...PAGE_TOURS.slice(1),
    ])
  })

  it('offers the BIM closer tours on the BIM viewer, without the map-only ones', () => {
    const list = ids(ViewerNames.bim)
    expect(list.slice(list.indexOf('bim'), list.indexOf('bim') + 3)).toEqual(['bim', 'tools', 'panel-file'])
    expect(list).not.toContain('datasets')
    expect(list).not.toContain('measure')
  })

  it('offers no closer tours on a page without a viewer', () => {
    expect(ids(ViewerNames.settings)).toEqual(['platform', ...PAGE_TOURS])
  })

  it('leaves out the viewers, data pages and panel tabs this organization or role does not have', () => {
    const list = ids(ViewerNames.map, { available: { viewers: ['map'], dataPages: ['sites'] }, a: actions(() => false) })
    expect(list).toEqual(['platform', 'map', 'tools', 'datasets', 'measure', 'panel-settings', 'data-sites', 'plugins', 'settings'])
  })

  it('names each step by its title and leaves out steps that would be skipped', () => {
    const bim = tourSections(context(ViewerNames.map), vi.fn()).find(section => section.id === 'bim')
    expect(bim?.title).toBe('viewerTour.bim.title')
    expect(bim?.steps[0]).toEqual({ id: 'intro', title: 'viewerTour.bim.title' })
    expect(bim?.steps.map(s => s.id)).not.toContain('no-building')
  })

  it('starts the picked section on the picked step', () => {
    const start = vi.fn()
    tourSections(context(ViewerNames.map), start).find(section => section.id === 'datasets')?.start('tabs')
    expect(start).toHaveBeenCalledWith('datasets', 'tabs')
  })
})

describe('pageOfTour', () => {
  it('names the page a tour runs on, and nothing for tours that run on the page already open', () => {
    expect(pageOfTour('bim')).toBe(ViewerNames.bim)
    expect(pageOfTour('data-files')).toBe(ViewerNames.files)
    expect(pageOfTour('settings')).toBe(ViewerNames.settings)
    expect(pageOfTour('datasets')).toBeUndefined()
    expect(pageOfTour('platform')).toBeUndefined()
  })
})
