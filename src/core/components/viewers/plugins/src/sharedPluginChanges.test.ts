// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { sharedPluginChanges } from './sharedPluginChanges'

import type { MountedPlugin } from './useMountedPlugins'

const shared = (slug: string, registryVersion: string): MountedPlugin => ({
  manifest: { slug, name: slug.toUpperCase(), version: registryVersion, capabilities: [] },
  bundleUrl: `/api/plugins/${slug}/bundle`,
  source: 'registry',
  registryVersion,
})

const mounted: MountedPlugin = {
  manifest: { slug: 'local', name: 'LOCAL', version: '1.0.0', capabilities: [] },
  bundleUrl: '/api/plugins/local/bundle',
  mountPath: '/plugins/local',
  source: 'mounted',
}

describe('sharedPluginChanges', () => {
  it('reports a plugin newly shared with the organization', () => {
    expect(sharedPluginChanges([], [shared('a', '1.0.0')])).toEqual([{ kind: 'added', name: 'A' }])
  })

  it('reports a re-pinned version and a revoked share', () => {
    expect(sharedPluginChanges([shared('a', '1.0.0'), shared('b', '2.0.0')], [shared('a', '1.1.0')])).toEqual([
      { kind: 'updated', name: 'A', version: '1.1.0' },
      { kind: 'removed', name: 'B' },
    ])
  })

  it('ignores mounted plugins and unchanged shares', () => {
    expect(sharedPluginChanges([mounted, shared('a', '1.0.0')], [shared('a', '1.0.0')])).toEqual([])
  })
})
