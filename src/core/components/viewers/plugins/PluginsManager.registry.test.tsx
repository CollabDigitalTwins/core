// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import * as React from 'react'

import { PluginsManager } from './PluginsManager'

import type { PluginListing, RegistryActions, RegistryPlugin, RegistryState } from './types'

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
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
  viewer: { email: 'nico@example.org', canPublish: true, canGrant, canPublishFromDisk: true },
  plugins,
})

const productionAdmin = (plugins: RegistryPlugin[]): RegistryState => ({
  configured: true,
  viewer: { email: 'admin@example.org', canPublish: true, canGrant: true, canPublishFromDisk: false },
  plugins,
})

function actions(overrides: Partial<RegistryActions> = {}): RegistryActions {
  return {
    publishMounted: vi.fn().mockResolvedValue({ version: '1.0.0', claimed: true }),
    removeVersion: vi.fn(),
    removePlugin: vi.fn().mockResolvedValue({}),
    installHere: vi.fn().mockResolvedValue(undefined),
    listOrganizations: vi.fn().mockResolvedValue([]),
    setGrant: vi.fn(),
    revokeGrant: vi.fn(),
    exportPackage: vi.fn().mockResolvedValue({ fileName: 'ifc-checker-1.0.0.cdtplugin.json', contents: new Blob(['{}']) }),
    importPackage: vi.fn().mockResolvedValue({ slug: 'ifc-checker', version: '1.0.0', claimed: true, sha256: 'abc' }),
    exportMountedPackage: vi.fn().mockResolvedValue({ fileName: 'ifc-checker-1.0.0.cdtplugin.json', contents: new Blob(['{}']) }),
    ...overrides,
  }
}

// jsdom's File has no text().
function packageFile(text: string): File {
  return Object.assign(new File([text], 'package.cdtplugin.json', { type: 'application/json' }), { text: () => Promise.resolve(text) })
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
    fireEvent.mouseDown(screen.getByRole('tab', { name: /^tabNotInstalled/ }))

    expect(screen.queryByRole('tab', { name: /^tabLabel/ })).not.toBeInTheDocument()
    expect(row('ifc-checker').queryByRole('button', { name: 'publishFirst' })).not.toBeInTheDocument()
  })

  it('shows an org admin outside the dev team which version is shared with them, and nothing else', () => {
    const granted = { ...mounted(), mountPath: undefined, registryVersion: '1.0.0' }
    render(<PluginsManager listings={[granted]} registryActions={actions()} />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: /^tabNotInstalled/ }))

    expect(screen.getByRole('columnheader', { name: /columnRegistry/ })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /^tabLabel/ })).not.toBeInTheDocument()
    expect(row('ifc-checker').getByText('badgeShared')).toBeInTheDocument()
    expect(screen.queryByTestId('registry-details-ifc-checker')).not.toBeInTheDocument()
  })

  it('shows the dev team why the registry failed to load instead of hiding the tab', () => {
    registryState.current = { ...devTeam([]), error: { code: 'unavailable', message: 'The registry database did not answer' } }
    render(<PluginsManager listings={[]} registryActions={actions()} />)
    openRegistry()

    expect(screen.getByText('errorHeading')).toBeInTheDocument()
    expect(screen.getByText('The registry database did not answer')).toBeInTheDocument()
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
    fireEvent.mouseDown(screen.getByRole('tab', { name: /^tabNotInstalled/ }))

    row('ifc-checker').getByRole('button', { name: 'publishFirst' }).click()
    ;(await screen.findByRole('button', { name: 'publishConfirm' })).click()

    await vi.waitFor(() => expect(publishMounted).toHaveBeenCalledWith('ifc-checker'))
    expect(toast.success).toHaveBeenCalledWith('toastClaimed')
  })

  it('does not publish when the confirmation is cancelled', async () => {
    registryState.current = devTeam([])
    const publishMounted = vi.fn()
    render(<PluginsManager listings={[mounted()]} registryActions={actions({ publishMounted })} />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: /^tabNotInstalled/ }))

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
    expect(within(screen.getByTestId('registry-strip-ifc-checker')).queryByRole('button', { name: /^publish/ })).not.toBeInTheDocument()

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

  it('removes an unshared plugin without touching any organization', async () => {
    registryState.current = devTeam([registryPlugin({ grants: [] })], true)
    const removePlugin = vi.fn().mockResolvedValue({})
    render(<PluginsManager listings={[]} registryActions={actions({ removePlugin })} />)
    openRegistry()

    row('ifc-checker').getByRole('button', { name: 'removePlugin' }).click()
    expect(await screen.findByText('removePluginDescription')).toBeInTheDocument()
    screen.getByRole('button', { name: 'removeConfirm' }).click()

    await vi.waitFor(() => expect(removePlugin).toHaveBeenCalledWith('ifc-checker', { force: false }))
    expect(toast.success).toHaveBeenCalledWith('toastPluginRemoved')
  })

  it('warns before removing a shared plugin, then saves the backup of the wiped data', async () => {
    const grant = { organizationId: 5, organizationName: 'Acme', pinnedVersion: null, resolvedVersion: '1.0.0' }
    registryState.current = devTeam([registryPlugin({ grants: [grant, { ...grant, organizationId: 6 }] })], true)
    const backup = { fileName: 'ifc-checker-data-2026-10-08.csv', contents: new Blob(['table']) }
    const removePlugin = vi.fn().mockResolvedValue({ backup })
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() })
    const save = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<PluginsManager listings={[]} registryActions={actions({ removePlugin })} />)
    openRegistry()

    row('ifc-checker').getByRole('button', { name: 'removePlugin' }).click()
    expect(await screen.findByText('removeSharedPluginDescription')).toBeInTheDocument()
    screen.getByRole('button', { name: 'removeSharedConfirm' }).click()

    await vi.waitFor(() => expect(removePlugin).toHaveBeenCalledWith('ifc-checker', { force: true }))
    expect(save).toHaveBeenCalledOnce()
    expect(toast.success).toHaveBeenCalledWith('toastSharedPluginRemoved')
    save.mockRestore()
  })

  it('lets a platform admin install a registry plugin into their own organization in one step', async () => {
    registryState.current = productionAdmin([registryPlugin()])
    const installHere = vi.fn().mockResolvedValue(undefined)
    render(<PluginsManager listings={[]} registryActions={actions({ installHere })} />)
    openRegistry()

    row('ifc-checker').getByRole('button', { name: 'installHere' }).click()

    await vi.waitFor(() => expect(installHere).toHaveBeenCalledWith('ifc-checker'))
    expect(toast.success).toHaveBeenCalledWith('toastInstalledHere')
  })

  it('offers installing into the organization to platform admins only', () => {
    registryState.current = devTeam([registryPlugin()])
    render(<PluginsManager listings={[]} registryActions={actions()} />)
    openRegistry()

    expect(row('ifc-checker').queryByRole('button', { name: 'installHere' })).not.toBeInTheDocument()
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

  it('lets the owner delete a retired version, saying it is gone for good', async () => {
    const retired = { ...registryPlugin().versions[0], status: 'YANKED' as const }
    registryState.current = devTeam([registryPlugin({ versions: [retired], latestVersion: null })])
    const removeVersion = vi.fn().mockResolvedValue({ outcome: 'deleted' })
    render(<PluginsManager listings={[]} registryActions={actions({ removeVersion })} />)
    openRegistry()

    row('ifc-checker').getByRole('button', { name: 'removeVersionLabel' }).click()
    expect(await screen.findByText('removeRetiredVersionDescription')).toBeInTheDocument()
    screen.getByRole('button', { name: 'removeConfirm' }).click()

    await vi.waitFor(() => expect(removeVersion).toHaveBeenCalledWith('ifc-checker', '1.0.0'))
    expect(toast.success).toHaveBeenCalledWith('toastVersionDeleted')
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

  it('never offers publishing from disk where the server turns it off', () => {
    registryState.current = productionAdmin([])
    render(<PluginsManager listings={[mounted()]} registryActions={actions()} />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: /^tabNotInstalled/ }))

    expect(row('ifc-checker').queryByRole('button', { name: 'publishFirst' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('registry-strip-ifc-checker')).not.toBeInTheDocument()
  })

  it('lets a production platform admin share an imported plugin with no local copy', () => {
    registryState.current = productionAdmin([registryPlugin({ ownedByMe: false })])
    render(<PluginsManager listings={[]} registryActions={actions()} />)
    openRegistry()

    const card = row('ifc-checker')
    expect(screen.getByRole('columnheader', { name: /columnVisibleTo/ })).toBeInTheDocument()
    expect(card.getAllByRole('combobox', { name: 'grantTitle' }).length).toBeGreaterThan(0)
    expect(screen.queryByTestId('registry-strip-ifc-checker')).not.toBeInTheDocument()
  })

  it('points an empty production registry at importing rather than publishing from disk', () => {
    registryState.current = productionAdmin([])
    render(<PluginsManager listings={[]} registryActions={actions()} />)
    openRegistry()

    expect(screen.getByText('emptyImport')).toBeInTheDocument()
  })

  it('does not point a publisher who cannot import at importing', () => {
    registryState.current = { ...productionAdmin([]), viewer: { email: 'dev@example.org', canPublish: true, canGrant: false, canPublishFromDisk: false } }
    render(<PluginsManager listings={[]} registryActions={actions()} />)
    openRegistry()

    expect(screen.getByText('emptyAwaitingImport')).toBeInTheDocument()
    expect(screen.queryByText('emptyImport')).not.toBeInTheDocument()
  })

  it('offers importing a package to platform admins only', () => {
    registryState.current = devTeam([registryPlugin()])
    const { rerender } = render(<PluginsManager listings={[]} registryActions={actions()} />)
    openRegistry()
    expect(screen.queryByRole('button', { name: 'importPackage' })).not.toBeInTheDocument()

    registryState.current = productionAdmin([registryPlugin()])
    rerender(<PluginsManager listings={[]} registryActions={actions()} />)
    expect(screen.getByRole('button', { name: 'importPackage' })).toBeInTheDocument()
  })

  it('imports a chosen package file after confirming its sha256', async () => {
    registryState.current = productionAdmin([])
    const importPackage = vi.fn().mockResolvedValue({ slug: 'ifc-checker', version: '1.0.0', claimed: true, sha256: 'abc' })
    render(<PluginsManager listings={[]} registryActions={actions({ importPackage })} />)
    openRegistry()

    const pkg = { format: 1, manifest: { slug: 'ifc-checker', name: 'IFC checker', version: '1.0.0', hostApi: 1 }, bundle: 'eA==', sha256: 'abc' }
    const file = packageFile(JSON.stringify(pkg))
    fireEvent.change(screen.getByTestId('registry-import-file'), { target: { files: [file] } })
    expect(await screen.findByText('importFacts')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'importConfirm' }))

    await vi.waitFor(() => expect(importPackage).toHaveBeenCalledWith(pkg))
    expect(toast.success).toHaveBeenCalledWith('toastImported')
  })

  it('rejects a file that is not a package without calling the registry', async () => {
    registryState.current = productionAdmin([])
    const importPackage = vi.fn()
    render(<PluginsManager listings={[]} registryActions={actions({ importPackage })} />)
    openRegistry()

    const file = packageFile('not json')
    fireEvent.change(screen.getByTestId('registry-import-file'), { target: { files: [file] } })

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('importInvalidFile'))
    expect(importPackage).not.toHaveBeenCalled()
  })

  it('exports a mounted build as a package file without publishing it', async () => {
    registryState.current = devTeam([])
    const exportMountedPackage = vi.fn().mockResolvedValue({ fileName: 'ifc-checker-1.0.0.cdtplugin.json', contents: new Blob(['{}']) })
    const publishMounted = vi.fn()
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() })
    const save = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<PluginsManager listings={[mounted()]} registryActions={actions({ exportMountedPackage, publishMounted })} />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: /^tabNotInstalled/ }))

    within(screen.getByTestId('plugin-ifc-checker')).getByRole('button', { name: 'toggleDetails' }).click()
    within(await screen.findByTestId('registry-strip-ifc-checker')).getByRole('button', { name: 'exportPackageLabel' }).click()

    await vi.waitFor(() => expect(exportMountedPackage).toHaveBeenCalledWith('ifc-checker'))
    expect(toast.success).toHaveBeenCalledWith('toastExported')
    expect(save).toHaveBeenCalledOnce()
    expect(publishMounted).not.toHaveBeenCalled()
    save.mockRestore()
  })

  it('never offers exporting from disk where the server turns it off', () => {
    registryState.current = productionAdmin([])
    render(<PluginsManager listings={[mounted()]} registryActions={actions()} />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: /^tabNotInstalled/ }))

    expect(row('ifc-checker').queryByRole('button', { name: 'exportPackageLabel' })).not.toBeInTheDocument()
  })

  it('exports a published version as a package file', async () => {
    registryState.current = devTeam([registryPlugin()])
    const exportPackage = vi.fn().mockResolvedValue({ fileName: 'ifc-checker-1.0.0.cdtplugin.json', contents: new Blob(['{}']) })
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() })
    const save = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<PluginsManager listings={[]} registryActions={actions({ exportPackage })} />)
    openRegistry()

    row('ifc-checker').getByRole('button', { name: 'exportPackageLabel' }).click()

    await vi.waitFor(() => expect(exportPackage).toHaveBeenCalledWith('ifc-checker', '1.0.0'))
    expect(toast.success).toHaveBeenCalledWith('toastExported')
    expect(save).toHaveBeenCalledOnce()
    save.mockRestore()
  })
})
