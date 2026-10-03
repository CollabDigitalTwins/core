// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { ViewerNames } from '../types/dbTypes'

import { ALWAYS_AVAILABLE_VIEWERS, hasAppContent, resolveAppContent } from './appContent'

import type { Organization } from '../types/dbTypes'

const org = (appContent: ViewerNames[]) => ({ appContent } as Organization)

describe('resolveAppContent', () => {
  it('grants everything when the field is not configured', () => {
    const all = resolveAppContent(org([]))
    expect(all).toContain(ViewerNames.map)
    expect(all).toContain(ViewerNames.bim)
    expect(all).toContain(ViewerNames.sites)
    expect(all).toContain(ViewerNames.buildings)
  })

  it('grants everything for a missing organization', () => {
    expect(resolveAppContent(null)).toContain(ViewerNames.bim)
    expect(resolveAppContent(undefined)).toContain(ViewerNames.bim)
  })

  it('grants only what is configured, plus the always-available viewers', () => {
    expect(resolveAppContent(org([ViewerNames.bim])))
      .toEqual([ViewerNames.map, ViewerNames.plugins, ViewerNames.settings, ViewerNames.bim])
  })

  it.each([ViewerNames.map, ViewerNames.plugins, ViewerNames.settings])(
    'always includes %s even when it is not listed',
    viewer => {
      expect(resolveAppContent(org([ViewerNames.files]))).toContain(viewer)
    },
  )

  it('lists an always-available viewer once when appContent also stores it', () => {
    const resolved = resolveAppContent(org([ViewerNames.plugins, ViewerNames.bim]))
    expect(resolved.filter(viewer => viewer === ViewerNames.plugins)).toHaveLength(1)
  })
})

describe('ALWAYS_AVAILABLE_VIEWERS', () => {
  it('is exactly the map, plugins and settings', () => {
    expect([...ALWAYS_AVAILABLE_VIEWERS]).toEqual([ViewerNames.map, ViewerNames.plugins, ViewerNames.settings])
  })
})

describe('hasAppContent', () => {
  it('is false for a viewer the organization did not switch on', () => {
    expect(hasAppContent(org([ViewerNames.bim]), ViewerNames.sites)).toBe(false)
  })

  it('is true for a configured viewer', () => {
    expect(hasAppContent(org([ViewerNames.bim]), ViewerNames.bim)).toBe(true)
  })

  it('is true for everything when nothing is configured', () => {
    expect(hasAppContent(org([]), ViewerNames.sites)).toBe(true)
  })
})
