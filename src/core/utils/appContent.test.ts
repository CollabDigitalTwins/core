// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { ViewerNames } from '../types/dbTypes'

import { hasAppContent, resolveAppContent } from './appContent'

import type { Organization } from '../types/dbTypes'

const org = (appContent: ViewerNames[]) => ({ appContent } as Organization)

describe('resolveAppContent', () => {
  it('grants everything when the field is not configured', () => {
    const all = resolveAppContent(org([]))
    expect(all).toContain(ViewerNames.map)
    expect(all).toContain(ViewerNames.bim)
    expect(all).toContain(ViewerNames.pointcloud)
    expect(all).toContain(ViewerNames.buildings)
  })

  it('grants everything for a missing organization', () => {
    expect(resolveAppContent(null)).toContain(ViewerNames.bim)
    expect(resolveAppContent(undefined)).toContain(ViewerNames.bim)
  })

  it('grants only what is configured, plus the map', () => {
    expect(resolveAppContent(org([ViewerNames.bim])))
      .toEqual([ViewerNames.map, ViewerNames.bim])
  })

  it('always includes the map even when it is not listed', () => {
    expect(resolveAppContent(org([ViewerNames.files]))).toContain(ViewerNames.map)
  })
})

describe('hasAppContent', () => {
  it('is false for a viewer the organization did not switch on', () => {
    expect(hasAppContent(org([ViewerNames.bim]), ViewerNames.pointcloud)).toBe(false)
  })

  it('is true for a configured viewer', () => {
    expect(hasAppContent(org([ViewerNames.bim]), ViewerNames.bim)).toBe(true)
  })

  it('is true for everything when nothing is configured', () => {
    expect(hasAppContent(org([]), ViewerNames.pointcloud)).toBe(true)
  })
})
