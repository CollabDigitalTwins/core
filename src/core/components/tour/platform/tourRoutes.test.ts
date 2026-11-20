// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { ViewerNames } from '../../../types/dbTypes'

import { followViewer, pageTourOf, yieldsToPluginTours } from './tourRoutes'

import type { Leg } from './tourRoutes'

const overview: Leg = { tour: 'platform' }

describe('followViewer', () => {
  it('leaves the overview alone, which adapts on its own', () => {
    expect(followViewer([overview], ViewerNames.bim)).toEqual([overview])
  })

  it('swaps a viewer tour for the tour of the viewer the person moved to', () => {
    const legs: Leg[] = [overview, { tour: 'bim', returnTo: 'viewers' }]
    expect(followViewer(legs, ViewerNames.map)).toEqual([overview, { tour: 'map', returnTo: 'viewers' }])
  })

  it('drops nested tours that no longer apply', () => {
    const legs: Leg[] = [overview, { tour: 'map', returnTo: 'viewers' }, { tour: 'datasets', returnTo: 'tool-map-database' }]
    expect(followViewer(legs, ViewerNames.buildings)).toEqual([overview, { tour: 'data-buildings', returnTo: 'viewers' }])
  })

  it('keeps a side panel tab tour on either viewer with a side panel', () => {
    const legs: Leg[] = [overview, { tour: 'map', returnTo: 'viewers' }, { tour: 'panel-layers', returnTo: 'panel' }]
    expect(followViewer(legs, ViewerNames.bim)).toBe(legs)
  })

  it('returns to the overview step it left from on a page without its own tour', () => {
    const legs: Leg[] = [overview, { tour: 'map', returnTo: 'viewers' }]
    expect(followViewer(legs, ViewerNames.users)).toEqual([{ tour: 'platform', startAt: 'viewers' }])
  })

  it('keeps the toolbar tour and the viewer or data page choices on any page that fits them', () => {
    const tools: Leg[] = [overview, { tour: 'map', returnTo: 'explore' }, { tour: 'tools', returnTo: 'toolbar' }]
    const choice: Leg[] = [overview, { tour: 'explore-viewers', returnTo: 'explore' }]
    expect(followViewer(tools, ViewerNames.bim)).toBe(tools)
    expect(followViewer(choice, ViewerNames.files)).toBe(choice)
  })
})

describe('pageTourOf', () => {
  const available = { viewers: ['map' as const], dataPages: ['files' as const] }

  it('picks the tour of the viewer or data page the person is on', () => {
    expect(pageTourOf(ViewerNames.map, available)).toBe('map')
    expect(pageTourOf(ViewerNames.files, available)).toBe('data-files')
  })

  it('has none for a page the organization does not show, or one without a tour', () => {
    expect(pageTourOf(ViewerNames.bim, available)).toBeNull()
    expect(pageTourOf(ViewerNames.infrastructure, available)).toBeNull()
    expect(pageTourOf(ViewerNames.settings, available)).toBeNull()
  })
})

describe('yieldsToPluginTours', () => {
  it('steps aside on the plugins section, but not while the Hello Map demo runs', () => {
    expect(yieldsToPluginTours({ tour: 'plugins' })).toBe(true)
    expect(yieldsToPluginTours({ tour: 'plugins', startAt: 'list' })).toBe(true)
    expect(yieldsToPluginTours({ tour: 'plugins', startAt: 'hello-install' })).toBe(false)
    expect(yieldsToPluginTours({ tour: 'map', startAt: 'list' })).toBe(false)
  })
})
