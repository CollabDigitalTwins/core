// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { resolvePluginEnablement } from './enablement'

import type { OrgPluginInstallation, UserPluginSetting } from './enablement'

function install(overrides: Partial<OrgPluginInstallation> = {}): OrgPluginInstallation {
  return { pluginId: 'space-planning', enabled: true, allowUserOverride: true, ...overrides }
}

function setting(overrides: Partial<UserPluginSetting> = {}): UserPluginSetting {
  return { pluginId: 'space-planning', enabled: true, ...overrides }
}

describe('organization gate', () => {
  it('runs a plugin the organization enabled', () => {
    const { enabledSlugs } = resolvePluginEnablement([install()])
    expect(enabledSlugs).toEqual(['space-planning'])
  })

  it('does not run a plugin the organization disabled', () => {
    const { enabledSlugs } = resolvePluginEnablement([install({ enabled: false })])
    expect(enabledSlugs).toEqual([])
  })

  it('ignores a user setting for a plugin the organization never installed', () => {
    // The security property: a user cannot admit code the organization has not.
    const { enabledSlugs } = resolvePluginEnablement([], [setting({ pluginId: 'not-installed' })])
    expect(enabledSlugs).toEqual([])
  })
})

describe('user override', () => {
  it('lets a user opt out of a plugin that is on by default', () => {
    const { enabledSlugs } = resolvePluginEnablement(
      [install({ enabled: true })],
      [setting({ enabled: false })],
    )
    expect(enabledSlugs).toEqual([])
  })

  it('lets a user opt in to a plugin that is off by default', () => {
    const { enabledSlugs } = resolvePluginEnablement(
      [install({ enabled: false })],
      [setting({ enabled: true })],
    )
    expect(enabledSlugs).toEqual(['space-planning'])
  })

  it('leaves the organization default in place when the user has no setting', () => {
    expect(resolvePluginEnablement([install({ enabled: true })]).enabledSlugs).toEqual(['space-planning'])
    expect(resolvePluginEnablement([install({ enabled: false })]).enabledSlugs).toEqual([])
  })
})

describe('admin lock', () => {
  it('forces a plugin on despite a user opting out', () => {
    const { enabledSlugs } = resolvePluginEnablement(
      [install({ enabled: true, allowUserOverride: false })],
      [setting({ enabled: false })],
    )
    expect(enabledSlugs).toEqual(['space-planning'])
  })

  it('keeps a plugin off despite a user opting in', () => {
    const { enabledSlugs } = resolvePluginEnablement(
      [install({ enabled: false, allowUserOverride: false })],
      [setting({ enabled: true })],
    )
    expect(enabledSlugs).toEqual([])
  })
})

describe('config layering', () => {
  it('returns the organization config when the user has none', () => {
    const { configs } = resolvePluginEnablement([install({ config: { units: 'metric' } })])
    expect(configs['space-planning']).toEqual({ units: 'metric' })
  })

  it('lets a user override individual organization settings', () => {
    const { configs } = resolvePluginEnablement(
      [install({ config: { units: 'metric', showAreas: true } })],
      [setting({ config: { units: 'imperial' } })],
    )
    expect(configs['space-planning']).toEqual({ units: 'imperial', showAreas: true })
  })

  it('ignores a user config when the admin locked the plugin', () => {
    const { configs } = resolvePluginEnablement(
      [install({ config: { units: 'metric' }, allowUserOverride: false })],
      [setting({ config: { units: 'imperial' } })],
    )
    expect(configs['space-planning']).toEqual({ units: 'metric' })
  })

  it('yields an empty config rather than undefined when neither side set one', () => {
    const { configs } = resolvePluginEnablement([install()])
    expect(configs['space-planning']).toEqual({})
  })

  it('carries no config for a plugin that is not running', () => {
    const { configs } = resolvePluginEnablement([install({ enabled: false, config: { a: 1 } })])
    expect(configs).toEqual({})
  })
})

test('resolves several plugins independently', () => {
  const { enabledSlugs } = resolvePluginEnablement(
    [
      install({ pluginId: 'a', enabled: true }),
      install({ pluginId: 'b', enabled: false }),
      install({ pluginId: 'c', enabled: true, allowUserOverride: false }),
    ],
    [setting({ pluginId: 'b', enabled: true }), setting({ pluginId: 'c', enabled: false })],
  )

  expect(enabledSlugs).toEqual(['a', 'b', 'c'])
})
