// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { publishState } from './publishState'

import type { PluginManifest } from '../../../../plugins/sdk/types'
import type { RegistryPlugin, RegistryVersion } from '../types'

const manifest = (version: string): PluginManifest => ({ slug: 'ifc-checker', name: 'IFC checker', version, capabilities: ['bim.tools'] })

const version = (value: string, status: RegistryVersion['status'] = 'PUBLISHED'): RegistryVersion => ({
  version: value, status, hostApi: 1, sizeBytes: 10, sha256: 'x', publishedAt: '', publishedBy: 'Nico',
})

const entry = (versions: RegistryVersion[], ownedByMe = true): RegistryPlugin => ({
  slug: 'ifc-checker', name: 'IFC checker', description: null, icon: null,
  owner: { name: 'Kate', email: 'k@example.org' }, ownedByMe, latestVersion: null, versions,
})

describe('publishState', () => {
  it('offers the first publish when the registry has never seen the slug', () => {
    expect(publishState(manifest('1.0.0'), undefined, false)).toEqual({ kind: 'unpublished' })
  })

  it('offers an update when the mounted build is newer than anything published', () => {
    expect(publishState(manifest('1.10.0'), entry([version('1.9.0'), version('1.2.0')]), false))
      .toEqual({ kind: 'update', registryVersion: '1.9.0' })
  })

  it('asks for a version bump when this exact version exists, even if yanked', () => {
    expect(publishState(manifest('1.0.0'), entry([version('1.0.0', 'YANKED')]), false)).toEqual({ kind: 'alreadyPublished' })
  })

  it('says the mounted build is behind the registry', () => {
    expect(publishState(manifest('1.0.0'), entry([version('1.1.0')]), false)).toEqual({ kind: 'behind', registryVersion: '1.1.0' })
  })

  it('names the owner of a slug someone else claimed, unless the viewer is a platform admin', () => {
    expect(publishState(manifest('2.0.0'), entry([version('1.0.0')], false), false)).toEqual({ kind: 'taken', ownerName: 'Kate' })
    expect(publishState(manifest('2.0.0'), entry([version('1.0.0')], false), true).kind).toBe('update')
  })
})
