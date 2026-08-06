// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { SIDEBAR_TAB_META, resolveActiveTabId, visibleSidebarTabs } from './sidebarTabs'

import type { ViewerSidebarTab } from './sidebarTabs'

// `content` is irrelevant to both helpers, so keep the fixtures as bare ids.
const tab = (id: ViewerSidebarTab['id'], enabled?: boolean): ViewerSidebarTab => (
  enabled === undefined ? { id, content: null } : { id, content: null, enabled }
)

const MAP_TABS: ViewerSidebarTab[] = [
  tab('file'), tab('layers'), tab('communication'), tab('sensors'), tab('settings'),
]
const POINT_CLOUD_TABS: ViewerSidebarTab[] = [tab('file'), tab('settings')]

describe('visibleSidebarTabs', () => {
  it('keeps tabs with no `enabled` flag', () => {
    expect(visibleSidebarTabs(MAP_TABS).map(t => t.id)).toEqual(
      ['file', 'layers', 'communication', 'sensors', 'settings'],
    )
  })

  it('keeps tabs explicitly enabled and drops disabled ones', () => {
    const tabs = [tab('file', true), tab('communication', false), tab('settings')]
    expect(visibleSidebarTabs(tabs).map(t => t.id)).toEqual(['file', 'settings'])
  })

  it('preserves declaration order', () => {
    const tabs = [tab('settings'), tab('file'), tab('layers')]
    expect(visibleSidebarTabs(tabs).map(t => t.id)).toEqual(['settings', 'file', 'layers'])
  })
})

describe('resolveActiveTabId', () => {
  it('returns the selected tab when the viewer has it', () => {
    expect(resolveActiveTabId(MAP_TABS, 'sensors')).toBe('sensors')
  })

  it('falls back to the first tab when the viewer lacks the selected one', () => {
    // The real bug: Sensors selected in the map, then switch to the point cloud
    // viewer, which only has Files and Settings. Used to render an empty panel.
    expect(resolveActiveTabId(POINT_CLOUD_TABS, 'sensors')).toBe('file')
    expect(resolveActiveTabId(POINT_CLOUD_TABS, 'layers')).toBe('file')
  })

  it('keeps the selected tab across viewers that both have it', () => {
    expect(resolveActiveTabId(POINT_CLOUD_TABS, 'settings')).toBe('settings')
  })

  it('ignores disabled tabs when resolving', () => {
    const tabs = [tab('file', false), tab('communication', false), tab('settings')]
    expect(resolveActiveTabId(tabs, 'communication')).toBe('settings')
    expect(resolveActiveTabId(tabs, 'file')).toBe('settings')
  })

  it('returns null when nothing is visible', () => {
    expect(resolveActiveTabId([tab('file', false)], 'file')).toBeNull()
    expect(resolveActiveTabId([], 'file')).toBeNull()
  })
})

describe('SIDEBAR_TAB_META', () => {
  it('declares an icon and a label key for every sidebar tab', () => {
    const ids = ['file', 'layers', 'communication', 'sensors', 'settings'] as const
    const incomplete = ids.filter(id => !SIDEBAR_TAB_META[id]?.icon || !SIDEBAR_TAB_META[id]?.labelKey)
    expect(incomplete).toEqual([])
  })

  it('gives each tab a distinct icon so icon-only mode stays unambiguous', () => {
    const icons = Object.values(SIDEBAR_TAB_META).map(meta => meta.icon)
    expect(new Set(icons).size).toBe(icons.length)
  })
})
