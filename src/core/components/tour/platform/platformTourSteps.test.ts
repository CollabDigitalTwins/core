// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import en from '../../../i18n/messages/en.json'
import { ViewerNames } from '../../../types/dbTypes'

import { platformTourSteps } from './platformTourSteps'

const ANCHORS = new Set([
  'sidebar', 'sidebar-viewers', 'viewer-search', 'viewer-panel-toggle', 'toolbar',
  'sidebar-data', 'sidebar-plugins', 'sidebar-support', 'sidebar-account',
])

const echo = (key: string) => key

const resolve = (key: string) => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en.PlatformTour)

describe('platformTourSteps', () => {
  it('walks the map viewer from welcome to done, map text on the viewer steps', () => {
    const steps = platformTourSteps(ViewerNames.map, echo)
    expect(steps.map(s => s.id)).toEqual(['welcome', 'sidebar', 'viewers', 'search', 'panel', 'toolbar', 'data', 'plugins', 'support', 'account', 'done'])
    expect(steps.find(s => s.id === 'toolbar')?.title).toBe('toolbar.map.title')
  })

  it('uses BIM text for the search, panel and toolbar steps on the BIM viewer', () => {
    const steps = platformTourSteps(ViewerNames.bim, echo)
    expect(steps.filter(s => ['search', 'panel', 'toolbar'].includes(s.id)).map(s => s.title))
      .toEqual(['search.bim.title', 'panel.bim.title', 'toolbar.bim.title'])
  })

  it('drops the viewer steps on a data page, which has no search, panel or toolbar', () => {
    const ids = platformTourSteps(ViewerNames.files, echo).map(s => s.id)
    expect(ids).not.toContain('search')
    expect(ids).not.toContain('toolbar')
    expect(ids).toHaveLength(8)
  })

  it('points every step at a known anchor or the centre of the screen', () => {
    for (const viewer of [ViewerNames.map, ViewerNames.bim, ViewerNames.sites]) {
      for (const step of platformTourSteps(viewer, echo)) {
        expect(step.target === null || ANCHORS.has(step.target as string), step.id).toBe(true)
      }
    }
  })

  it('has an English title and body for every key it asks for', () => {
    for (const viewer of [ViewerNames.map, ViewerNames.bim]) {
      for (const step of platformTourSteps(viewer, echo)) {
        expect(typeof resolve(step.title), step.title).toBe('string')
        expect(typeof resolve(step.body as string), step.body as string).toBe('string')
      }
    }
  })
})
