// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'

import { usePluginsData } from './usePluginsData'

import type { PluginManifest } from '../../../../plugins/sdk/types'

/**
 * The join between compiled-in plugins and mounted ones.
 *
 * Everything else this hook does — installs, user settings, statuses — is covered
 * by the page's own tests. What is only testable here is the merge: whether a
 * plugin that exists solely on the deployment's disk reaches the page, and whether
 * it can shadow one compiled into the build.
 */

const manifest = (slug: string): PluginManifest => ({
  slug,
  name: slug,
  version: '1.0.0',
  capabilities: ['map.tools'],
})

const { mounted } = vi.hoisted(() => ({
  mounted: { current: [] as Array<{ manifest: PluginManifest; bundleUrl: string; mountPath: string }> },
}))

vi.mock('./useMountedPlugins', () => ({
  useMountedPlugins: () => ({ mounted: mounted.current, enabled: true, isLoading: false }),
}))

vi.mock('../../../../plugins/manifests', () => ({
  PLUGIN_MANIFESTS: [
    {
      slug: 'hello-map',
      name: 'hello-map',
      version: '1.0.0',
      capabilities: ['map.tools'],
    },
  ],
}))

vi.mock('../../../../hooks/plugins/plugins', () => ({
  usePluginInstallations: () => ({ installations: [], isLoading: false }),
  usePluginUserSettings: () => ({ userSettings: [], isLoading: false }),
  usePluginActions: () => ({}),
}))

vi.mock('../../../../plugins/host/provider', () => ({
  usePluginHost: () => null,
  usePluginsReady: () => true,
}))

beforeEach(() => {
  mounted.current = []
})

describe('usePluginsData', () => {
  it('lists compiled-in plugins as bundled, with no mount path', () => {
    const { result } = renderHook(() => usePluginsData())

    expect(result.current.listings).toHaveLength(1)
    expect(result.current.listings[0].manifest.slug).toBe('hello-map')
    expect(result.current.listings[0].bundled).toBe(true)
    expect(result.current.listings[0].mountPath).toBeUndefined()
  })

  it('adds a mounted plugin, carrying the path an administrator is trusting', () => {
    mounted.current = [{
      manifest: manifest('hello-mounted'),
      bundleUrl: '/api/plugins/hello-mounted/bundle',
      mountPath: '/app/plugins/hello-mounted',
    }]

    const { result } = renderHook(() => usePluginsData())

    const row = result.current.listings.find(listing => listing.manifest.slug === 'hello-mounted')
    expect(row).toBeDefined()
    expect(row?.bundled).toBe(false)
    expect(row?.mountPath).toBe('/app/plugins/hello-mounted')
    // Nothing is running merely because a folder was mounted.
    expect(row?.installed).toBe(false)
    expect(row?.orgEnabled).toBe(false)
  })

  it('never lets a mounted folder shadow a compiled-in plugin of the same slug', () => {
    // The server's scan refuses a folder whose manifest declares a different slug,
    // so a collision can only be a genuine name clash. The build wins: a mounted
    // folder must not be able to take over the identity of a plugin that shipped
    // with CDT.
    mounted.current = [{
      manifest: { ...manifest('hello-map'), name: 'Impostor' },
      bundleUrl: '/api/plugins/hello-map/bundle',
      mountPath: '/app/plugins/hello-map',
    }]

    const { result } = renderHook(() => usePluginsData())

    expect(result.current.listings).toHaveLength(1)
    expect(result.current.listings[0].manifest.name).toBe('hello-map')
    expect(result.current.listings[0].bundled).toBe(true)
  })

  it('is unchanged when nothing is mounted, which is every default deployment', () => {
    const { result } = renderHook(() => usePluginsData())

    expect(result.current.listings.every(listing => listing.bundled)).toBe(true)
  })
})
