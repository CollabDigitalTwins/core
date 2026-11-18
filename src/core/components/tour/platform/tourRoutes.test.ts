// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { ViewerNames } from '../../../types/dbTypes'

import { followViewer } from './tourRoutes'

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
})
