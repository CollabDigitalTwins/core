// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { nextSort, sortPluginRows } from './sortPluginRows'

import type { PluginRowData } from './pluginRows'
import type { PluginListing, RegistryPlugin } from '../types'

const listing = (slug: string, name: string, overrides: Partial<PluginListing> = {}): PluginListing => ({
  manifest: { slug, name, version: '1.0.0', capabilities: ['bim.tools'] },
  status: 'running',
  installed: true,
  orgEnabled: true,
  allowUserOverride: true,
  userEnabled: null,
  bundled: false,
  ...overrides,
})

const entry = (slug: string, grants: number): RegistryPlugin => ({
  slug,
  name: slug,
  description: null,
  icon: null,
  owner: { name: 'Nico', email: 'nico@example.org' },
  ownedByMe: true,
  latestVersion: '1.0.0',
  versions: [],
  grants: Array.from({ length: grants }, (_, index) => ({
    organizationId: index, organizationName: `org ${index}`, pinnedVersion: null, resolvedVersion: '1.0.0',
  })),
})

const running: PluginRowData = { slug: 'b', listing: listing('b', 'Bravo') }
const off: PluginRowData = { slug: 'a', listing: listing('a', 'alpha', { orgEnabled: false }) }
const available: PluginRowData = { slug: 'c', listing: listing('c', 'Charlie', { installed: false, status: 'available' }) }
const registryOnly: PluginRowData = { slug: 'd', entry: entry('d', 2) }
const rows = [running, off, available, registryOnly]

const slugs = (sorted: PluginRowData[]) => sorted.map(row => row.slug)

describe('sortPluginRows', () => {
  it('keeps the incoming order when unsorted', () => {
    expect(slugs(sortPluginRows(rows, null))).toEqual(['b', 'a', 'c', 'd'])
  })

  it('sorts by name case-insensitively, both ways', () => {
    expect(slugs(sortPluginRows(rows, { key: 'name', direction: 'asc' }))).toEqual(['a', 'b', 'c', 'd'])
    expect(slugs(sortPluginRows(rows, { key: 'name', direction: 'desc' }))).toEqual(['d', 'c', 'b', 'a'])
  })

  it('sorts by status running, off, available, then rows with no status', () => {
    expect(slugs(sortPluginRows(rows, { key: 'status', direction: 'asc' }))).toEqual(['b', 'a', 'c', 'd'])
  })

  it('puts running plugins first when sorting run descending', () => {
    expect(slugs(sortPluginRows(rows, { key: 'run', direction: 'desc' }))[0]).toBe('b')
  })

  it('sorts by how many organizations can see a plugin', () => {
    expect(slugs(sortPluginRows(rows, { key: 'visibleTo', direction: 'desc' }))[0]).toBe('d')
  })

  it('does not mutate its input', () => {
    sortPluginRows(rows, { key: 'name', direction: 'asc' })
    expect(slugs(rows)).toEqual(['b', 'a', 'c', 'd'])
  })
})

describe('nextSort', () => {
  it('cycles ascending, descending, then unsorted', () => {
    const asc = nextSort(null, 'name')
    expect(asc).toEqual({ key: 'name', direction: 'asc' })
    const desc = nextSort(asc, 'name')
    expect(desc).toEqual({ key: 'name', direction: 'desc' })
    expect(nextSort(desc, 'name')).toBeNull()
  })

  it('starts ascending when switching to another column', () => {
    expect(nextSort({ key: 'name', direction: 'desc' }, 'status')).toEqual({ key: 'status', direction: 'asc' })
  })
})
