// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { isInTab, isMine, matchesSearch, mergePluginRows, registryStanding } from './pluginRows'

import type { PluginsTab } from './pluginRows'
import type { PluginListing, RegistryPlugin } from '../types'

const listing = (overrides: Partial<PluginListing> = {}): PluginListing => ({
  manifest: { slug: 'ifc-checker', name: 'IFC checker', version: '1.0.0', capabilities: ['bim.tools'] },
  status: 'running',
  installed: true,
  orgEnabled: true,
  allowUserOverride: true,
  userEnabled: null,
  bundled: false,
  ...overrides,
})

const entry = (overrides: Partial<RegistryPlugin> = {}): RegistryPlugin => ({
  slug: 'ifc-checker',
  name: 'IFC checker',
  description: null,
  icon: null,
  owner: { name: 'Nico', email: 'nico@example.org' },
  ownedByMe: true,
  latestVersion: '1.0.0',
  versions: [{
    version: '1.0.0', status: 'PUBLISHED', hostApi: 1, sizeBytes: 1, sha256: 'x',
    publishedAt: '2026-09-28T00:00:00Z', publishedBy: 'Nico',
  }],
  ...overrides,
})

describe('mergePluginRows', () => {
  it('joins a mounted plugin and its registry entry into one row', () => {
    const rows = mergePluginRows([listing()], [entry(), entry({ slug: 'other' })])

    expect(rows.map(row => row.slug)).toEqual(['ifc-checker', 'other'])
    expect(rows[0]).toMatchObject({ listing: expect.any(Object), entry: expect.any(Object) })
    expect(rows[1].listing).toBeUndefined()
  })
})

describe('isInTab', () => {
  const ALL_TABS: PluginsTab[] = ['all', 'running', 'organization', 'available', 'registry']

  it('puts each organization state in exactly one of the first two tabs', () => {
    const added = { slug: 'a', listing: listing() }
    const notAdded = { slug: 'b', listing: listing({ installed: false, status: 'available' }) }

    expect([isInTab(added, 'organization', ALL_TABS), isInTab(added, 'available', ALL_TABS)]).toEqual([true, false])
    expect([isInTab(notAdded, 'organization', ALL_TABS), isInTab(notAdded, 'available', ALL_TABS)]).toEqual([false, true])
  })

  it('lists only what runs for the viewer under running, and everything under all', () => {
    const running = { slug: 'a', listing: listing() }
    const off = { slug: 'b', listing: listing({ orgEnabled: false }) }
    const registryOnly = { slug: 'c', entry: entry() }

    expect([running, off, registryOnly].map(row => isInTab(row, 'running', ALL_TABS))).toEqual([true, false, false])
    expect([running, off, registryOnly].map(row => isInTab(row, 'all', ALL_TABS))).toEqual([true, true, true])
  })

  it('keeps out of all what no other shown tab lists', () => {
    const notAdded = { slug: 'b', listing: listing({ installed: false, status: 'available' }) }
    expect(isInTab(notAdded, 'all', ['all', 'running', 'organization'])).toBe(false)
  })

  it('lists only published plugins under the registry, not unpublished mounted builds', () => {
    expect(isInTab({ slug: 'a', entry: entry() }, 'registry', ALL_TABS)).toBe(true)
    expect(isInTab({ slug: 'a', listing: listing({ mountPath: '/plugins/a' }), entry: entry() }, 'registry', ALL_TABS)).toBe(true)
    expect(isInTab({ slug: 'a', listing: listing({ mountPath: '/plugins/a' }) }, 'registry', ALL_TABS)).toBe(false)
    expect(isInTab({ slug: 'a', listing: listing({ bundled: true }) }, 'registry', ALL_TABS)).toBe(false)
  })
})

describe('isMine', () => {
  it('counts only registry plugins I own', () => {
    expect(isMine({ slug: 'a', entry: entry() })).toBe(true)
    expect(isMine({ slug: 'a', entry: entry({ ownedByMe: false }) })).toBe(false)
    expect(isMine({ slug: 'a', listing: listing({ mountPath: '/plugins/a' }) })).toBe(false)
  })
})

describe('matchesSearch', () => {
  it('matches a registry-only row by its registry name', () => {
    expect(matchesSearch({ slug: 'a', entry: entry({ name: 'Energy model' }) }, 'energy')).toBe(true)
  })
})

describe('registryStanding', () => {
  it('reports a mounted build against what the registry holds', () => {
    const row = { slug: 'ifc-checker', listing: listing({ mountPath: '/plugins/ifc-checker' }), entry: entry() }
    expect(registryStanding(row, { canGrant: false, canPublishFromDisk: true })).toEqual({ kind: 'alreadyPublished' })
  })

  it('shows a mounted build as published, not publishable, where publishing from disk is off', () => {
    const row = { slug: 'ifc-checker', listing: listing({ mountPath: '/plugins/ifc-checker' }), entry: entry() }
    expect(registryStanding(row, { canGrant: true, canPublishFromDisk: false }))
      .toEqual({ kind: 'published', version: row.entry.latestVersion })
  })

  it('tells an organization which granted version it runs', () => {
    expect(registryStanding({ slug: 'a', listing: listing({ registryVersion: '2.0.0' }) }, null))
      .toEqual({ kind: 'shared', version: '2.0.0' })
  })

  it('says nothing about a plugin the registry does not know', () => {
    expect(registryStanding({ slug: 'a', listing: listing({ bundled: true }) }, { canGrant: true, canPublishFromDisk: true })).toBeNull()
  })
})
