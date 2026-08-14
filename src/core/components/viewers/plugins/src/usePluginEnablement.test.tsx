// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'

import { usePluginEnablement } from './usePluginEnablement'

import type { PluginInstallation, PluginUserSetting } from '../../../../types/plugins'

/**
 * The rule itself lives in `plugins/enablement.ts` and is tested there. What is
 * only testable here is the state this hook reports *before* the two fetches land,
 * because that is what the host acts on for the first paint of every route.
 */

const { data } = vi.hoisted(() => ({
  data: {
    installations: [] as PluginInstallation[],
    userSettings: [] as PluginUserSetting[],
    isLoading: false,
  },
}))

vi.mock('../../../../hooks/plugins/plugins', () => ({
  usePluginInstallations: () => ({ installations: data.installations, isLoading: data.isLoading }),
  usePluginUserSettings: () => ({ userSettings: data.userSettings, isLoading: data.isLoading }),
}))

const install = (pluginId: string): PluginInstallation => ({
  id: 1,
  pluginId,
  enabled: true,
  allowUserOverride: true,
  config: null,
  version: '1.0.0',
  installedAt: '2026-08-14T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z',
  organizationId: 1,
  installedById: 1,
})

beforeEach(() => {
  data.installations = []
  data.userSettings = []
  data.isLoading = false
})

describe('usePluginEnablement', () => {
  it('enables nothing while the fetches are in flight', () => {
    data.isLoading = true
    // Would run if the org had it installed — the point is that it does not yet.
    data.installations = [install('hello-map')]

    const { result } = renderHook(() => usePluginEnablement())

    expect(result.current.isLoading).toBe(true)
    // Not undefined: the host reads undefined as "activate everything", which would
    // mount every compiled-in plugin for one paint before unmounting it again.
    expect(result.current.enabledSlugs).toEqual([])
    expect(result.current.configs).toEqual({})
  })

  it('enables what the organization installed once the fetches land', () => {
    data.installations = [install('hello-map')]

    const { result } = renderHook(() => usePluginEnablement())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.enabledSlugs).toEqual(['hello-map'])
  })

  it('enables nothing when the organization has installed nothing', () => {
    const { result } = renderHook(() => usePluginEnablement())

    expect(result.current.enabledSlugs).toEqual([])
  })
})
