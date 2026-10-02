// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import * as React from 'react'

import { PluginsManager } from './PluginsManager'

import type { PluginListing, RegistryActions, RegistryPlugin, RegistryState } from './types'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useMessages: () => ({}),
}))

const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))
vi.mock('sonner', () => ({ toast }))

vi.mock('../../../store/Permissions/context', () => ({
  usePermissions: () => ({ ability: { can: () => true }, permissions: [], isLoading: false, role: null }),
}))

vi.mock('./src/usePluginsData', () => ({
  usePluginsData: (listings?: PluginListing[]) => ({ listings: listings ?? [], isLoading: false }),
  usePluginsActions: () => ({ setInstalled: vi.fn(), setOrgEnabled: vi.fn(), setAllowUserOverride: vi.fn(), setUserEnabled: vi.fn() }),
}))

const { registryState } = vi.hoisted(() => ({ registryState: { current: { configured: false, plugins: [] } as RegistryState } }))
vi.mock('./src/useRegistryPlugins', async importOriginal => ({
  ...(await importOriginal<typeof import('./src/useRegistryPlugins')>()),
  useRegistryPlugins: () => ({ registry: registryState.current, isLoading: false, refresh: vi.fn() }),
  useRegistryActions: (override?: RegistryActions) => override,
}))

vi.mock('../../../plugins/host/provider', () => ({ usePluginHost: () => null }))
vi.mock('../../../plugins/installed', () => ({ INSTALLED_PLUGINS: [] }))

const mounted = (version = '1.0.0'): PluginListing => ({
  manifest: { slug: 'ifc-checker', name: 'IFC checker', version, capabilities: ['bim.tools'] },
  status: 'available',
  installed: false,
  orgEnabled: false,
  allowUserOverride: true,
  userEnabled: null,
  bundled: false,
  mountPath: '/plugins/ifc-checker',
})

const registryPlugin = (overrides: Partial<RegistryPlugin> = {}): RegistryPlugin => ({
  slug: 'ifc-checker',
  name: 'IFC checker',
  description: null,
  icon: null,
  owner: { name: 'Nico', email: 'nico@example.org' },
  ownedByMe: true,
  latestVersion: '1.0.0',
  versions: [{
    version: '1.0.0', status: 'PUBLISHED', hostApi: 1, sizeBytes: 100, sha256: 'x',
    publishedAt: '2026-09-28T00:00:00Z', publishedBy: 'Nico',
  }],
  ...overrides,
})

const devTeam = (plugins: RegistryPlugin[], canGrant = false): RegistryState => ({
  configured: true,
  viewer: { email: 'nico@example.org', canPublish: true, canGrant },
  plugins,
})

function actions(overrides: Partial<RegistryActions> = {}): RegistryActions {
  return {
    publishMounted: vi.fn().mockResolvedValue({ version: '1.0.0', claimed: true }),
    removeVersion: vi.fn(),
    removePlugin: vi.fn(),
    listOrganizations: vi.fn().mockResolvedValue([]),
    setGrant: vi.fn(),
    revokeGrant: vi.fn(),
    ...overrides,
  }
}

function openRegistry() {
  fireEvent.mouseDown(screen.getByRole('tab', { name: /^tabLabel/ }))
}

function row(slug: string) {
  const element = screen.getByTestId(`plugin-${slug}`)
  const toggle = within(element).getByRole('button', { name: 'toggleDetails' })
  if (toggle.getAttribute('aria-expanded') === 'false') fireEvent.click(toggle)
  return within(element)
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  registryState.current = { configured: false, plugins: [] }
  toast.success.mockReset()
  toast.error.mockReset()
})

describe('shared registry on the Plugins page', () => {
  it('shows nothing extra to someone outside the dev team', () => {
    render(<PluginsManager listings={[mounted()]} registryActions={actions()} />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: /^sectionFound/ }))

    expect(screen.queryByRole('tab', { name: /^tabLabel/ })).not.toBeInTheDocument()
    expect(row('ifc-checker').queryByRole('button', { name: 'publishFirst' })).not.toBeInTheDocument()
  })

  it('shows an org admin the plugins shared with them, read-only', () => {
    registryState.current = {
      configured: true,
      viewer: { email: 'admin@carleton.ca', canPublish: false, canGrant: false },
      plugins: [registryPlugin({ ownedByMe: false })],
    }
    const granted = { ...mounted(), mountPath: undefined, registryVersion: '1.0.0' }
    render(<PluginsManager listings={[granted]} registryActions={actions()} />)
    openRegistry()

    const scope = row('ifc-checker')
    expect(screen.getByText('sectionHintGranted')).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'filterMine' })).not.toBeInTheDocument()
    expect(scope.queryByText('badgeShared')).not.toBeInTheDocument()
    expect(scope.queryByRole('button', { name: /removePlugin/ })).not.toBeInTheDocument()
    expect(screen.queryByTestId('registry-details-ifc-checker')).not.toBeInTheDocument()
  })

  it('lists only published plugins in the registry tab', () => {
    registryState.current = devTeam([])
    render(<PluginsManager listings={[mounted()]} registryActions={actions()} />)
    openRegistry()

    expect(screen.queryByTestId('plugin-ifc-checker')).not.toBeInTheDocument()
  })

  it('publishes an unpublished mounted plugin from its row after confirmation', async () => {
    registryState.current = devTeam([])
    const publishMounted = vi.fn().mockResolvedValue({ version: '1.0.0', claimed: true })
    render(<PluginsManager listings={[mounted()]} registryActions={actions({ publishMounted })} />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: /^sectionFound/ }))

    row('ifc-checker').getByRole('button', { name: 'publishFirst' }).click()
    ;(await screen.findByRole('button', { name: 'publishConfirm' })).click()

    await vi.waitFor(() => expect(publishMounted).toHaveBeenCalledWith('ifc-checker'))
    expect(toast.success).toHaveBeenCalledWith('toastClaimed')
  })

  it('does not publish when the confirmation is cancelled', async () => {
    registryState.current = devTeam([])
    const publishMounted = vi.fn()
    render(<PluginsManager listings={[mounted()]} registryActions={actions({ publishMounted })} />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: /^sectionFound/ }))

    row('ifc-checker').getByRole('button', { name: 'publishFirst' }).click()
    fireEvent.click(await screen.findByRole('button', { name: 'cancel' }))

    await vi.waitFor(() => expect(screen.queryByRole('button', { name: 'publishConfirm' })).not.toBeInTheDocument())
    expect(publishMounted).not.toHaveBeenCalled()
  })

  it('offers an update only when the mounted build is newer', () => {
    registryState.current = devTeam([registryPlugin()])
    const { rerender } = render(<PluginsManager listings={[mounted('1.0.0')]} registryActions={actions()} />)
    openRegistry()
    row('ifc-checker')
    expect(within(screen.getByTestId('registry-strip-ifc-checker')).queryByRole('button')).not.toBeInTheDocument()

    rerender(<PluginsManager listings={[mounted('1.1.0')]} registryActions={actions()} />)
    expect(screen.getByRole('button', { name: 'publishUpdate' })).toBeInTheDocument()
  })

  it('explains that someone else owns the slug instead of offering to publish', () => {
    registryState.current = devTeam([registryPlugin({ ownedByMe: false })])
    render(<PluginsManager listings={[mounted('2.0.0')]} registryActions={actions()} />)
    openRegistry()
    row('ifc-checker')

    expect(within(screen.getByTestId('registry-strip-ifc-checker')).getByText('hintTaken')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^publish/ })).not.toBeInTheDocument()
  })

  it('filters the registry to my own plugins', async () => {
    registryState.current = devTeam([registryPlugin(), registryPlugin({ slug: 'other', name: 'Other', ownedByMe: false })])
    render(<PluginsManager listings={[]} registryActions={actions()} />)
    openRegistry()

    expect(screen.getByTestId('plugin-other')).toBeInTheDocument()
    screen.getByRole('radio', { name: 'filterMine' }).click()
    await vi.waitFor(() => expect(screen.queryByTestId('plugin-other')).not.toBeInTheDocument())
    expect(screen.getByTestId('plugin-ifc-checker')).toBeInTheDocument()
  })

  it('gives access controls to platform admins only, and removal only to owners', () => {
    registryState.current = devTeam([registryPlugin({ slug: 'other', name: 'Other', ownedByMe: false })])
    const { rerender } = render(<PluginsManager listings={[]} registryActions={actions()} />)
    openRegistry()
    const card = () => row('other')
    expect(screen.queryByRole('columnheader', { name: /columnVisibleTo/ })).not.toBeInTheDocument()
    expect(card().queryByRole('combobox', { name: 'grantTitle' })).not.toBeInTheDocument()
    expect(card().queryByRole('button', { name: 'removePlugin' })).not.toBeInTheDocument()

    registryState.current = devTeam(registryState.current.plugins, true)
    rerender(<PluginsManager listings={[]} registryActions={actions()} />)
    expect(screen.getByRole('columnheader', { name: /columnVisibleTo/ })).toBeInTheDocument()
    expect(card().getAllByRole('combobox', { name: 'grantTitle' }).length).toBeGreaterThan(0)
    expect(card().getByRole('button', { name: 'removePlugin' })).toBeInTheDocument()
  })

  it('grants an organization the latest version from the Visible to picker', async () => {
    registryState.current = devTeam([registryPlugin()], true)
    const setGrant = vi.fn().mockResolvedValue(undefined)
    const listOrganizations = vi.fn().mockResolvedValue([{ id: 5, name: 'acme', title: 'Acme' }])
    render(<PluginsManager listings={[]} registryActions={actions({ setGrant, listOrganizations })} />)
    openRegistry()

    fireEvent.click(within(screen.getByTestId('plugin-ifc-checker')).getByRole('combobox', { name: 'grantTitle' }))
    fireEvent.click(await screen.findByRole('option', { name: /Acme/ }))

    await vi.waitFor(() => expect(setGrant).toHaveBeenCalledWith('ifc-checker', 5, null))
    expect(toast.success).toHaveBeenCalledWith('toastGranted')
  })

  it('revokes an organization from the access list in the details', async () => {
    const grant = { organizationId: 5, organizationName: 'Acme', pinnedVersion: '1.0.0', resolvedVersion: '1.0.0' }
    registryState.current = devTeam([registryPlugin({ grants: [grant] })], true)
    const revokeGrant = vi.fn().mockResolvedValue(undefined)
    render(<PluginsManager listings={[]} registryActions={actions({ revokeGrant })} />)
    openRegistry()

    const details = row('ifc-checker')
    expect(details.getByRole('combobox', { name: 'grantPinFor' })).toBeInTheDocument()
    fireEvent.click(details.getByRole('button', { name: 'grantRevokeFor' }))

    await vi.waitFor(() => expect(revokeGrant).toHaveBeenCalledWith('ifc-checker', 5))
  })

  it('confirms before removing a version and reports a yank', async () => {
    registryState.current = devTeam([registryPlugin()])
    const removeVersion = vi.fn().mockResolvedValue({ outcome: 'yanked' })
    render(<PluginsManager listings={[]} registryActions={actions({ removeVersion })} />)
    openRegistry()

    row('ifc-checker').getByRole('button', { name: 'removeVersionLabel' }).click()
    ;(await screen.findByRole('button', { name: 'removeConfirm' })).click()

    await vi.waitFor(() => expect(removeVersion).toHaveBeenCalledWith('ifc-checker', '1.0.0'))
    expect(toast.success).toHaveBeenCalledWith('toastVersionYanked')
  })

  it('shows a published plugin once, with its registry state on the organization row', () => {
    registryState.current = devTeam([registryPlugin()])
    render(<PluginsManager listings={[{ ...mounted(), status: 'running', installed: true, orgEnabled: true }]} registryActions={actions()} />)

    expect(screen.getAllByTestId('plugin-ifc-checker')).toHaveLength(1)
    const scope = row('ifc-checker')
    expect(scope.getByText('badgePublished')).toBeInTheDocument()
    expect(scope.getByRole('switch', { name: 'orgEnabled' })).toBeInTheDocument()
    expect(scope.getByText('hintAlreadyPublished')).toBeInTheDocument()
  })
})
