// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import * as React from 'react'

import { PluginsManager } from './PluginsManager'

import type { PluginListing, PluginsActions } from './types'

// Translate to the key so assertions name the string being shown, not its wording.
vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key
    return t
  },
  useMessages: () => ({}),
}))

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))
vi.mock('sonner', () => ({ toast }))

const { permissions } = vi.hoisted(() => ({
  permissions: { current: [] as Array<{ action: string; subject: string }> },
}))
vi.mock('../../../store/Permissions/context', () => ({
  usePermissions: () => ({
    ability: {
      can: (action: string, subject: string) =>
        permissions.current.some(p => p.action === action && p.subject === subject),
    },
    permissions: permissions.current,
    isLoading: false,
    role: null,
  }),
}))

// The data layer is stubbed, so these listings are the whole fixture. `effectiveStatus`
// keeps its real implementation: it is pure, and it picks the badge and the section.
const { boundActions } = vi.hoisted(() => ({
  boundActions: {
    setInstalled: vi.fn(),
    setOrgEnabled: vi.fn(),
    setAllowUserOverride: vi.fn(),
    setUserEnabled: vi.fn(),
  },
}))

vi.mock('./src/usePluginsData', () => ({
  usePluginsData: (listings?: PluginListing[]) => ({
    listings: listings ?? [],
    isLoading: false,
  }),
  usePluginsActions: (override?: PluginsActions) => override ?? boundActions,
}))

// The page nudges the live host after a write; not under test here.
vi.mock('../../../plugins/host/provider', () => ({ usePluginHost: () => null }))
vi.mock('../../../plugins/installed', () => ({ INSTALLED_PLUGINS: [] }))

const ADMIN = [
  { action: 'read', subject: 'PluginInstallation' },
  { action: 'create', subject: 'PluginInstallation' },
  { action: 'update', subject: 'PluginInstallation' },
  { action: 'update', subject: 'PluginUserSetting' },
]
const MEMBER = [
  { action: 'read', subject: 'PluginInstallation' },
  { action: 'update', subject: 'PluginUserSetting' },
]
// The Viewer role as seeded in the app: reads both subjects, writes neither.
const VIEWER = [
  { action: 'read', subject: 'PluginInstallation' },
  { action: 'read', subject: 'PluginUserSetting' },
]

function listing(overrides: Partial<PluginListing> = {}): PluginListing {
  return {
    manifest: {
      slug: 'space-planning',
      name: 'Space Planning',
      version: '0.2.0',
      description: 'Lists the spaces in a BIM model.',
      capabilities: ['bim.tools'],
    },
    status: 'running',
    installed: true,
    orgEnabled: true,
    allowUserOverride: true,
    userEnabled: null,
    bundled: false,
    ...overrides,
  }
}

function card() {
  return screen.getByTestId('plugin-space-planning')
}

afterEach(() => {
  permissions.current = []
  toast.success.mockReset()
  toast.error.mockReset()
  toast.warning.mockReset()
})

describe('controls by role', () => {
  it('gives an admin the organization switches and their own', () => {
    permissions.current = ADMIN
    render(<PluginsManager listings={[listing()]} />)

    const scope = within(card())
    expect(scope.getByRole('switch', { name: 'orgInstalled' })).toBeInTheDocument()
    expect(scope.getByRole('switch', { name: 'orgEnabled' })).toBeInTheDocument()
    expect(scope.getByRole('switch', { name: 'orgAllowOverride' })).toBeInTheDocument()
    expect(scope.getByRole('switch', { name: 'userRun' })).toBeInTheDocument()
  })

  it('gives a non-admin only their own switch, and the org state read-only', () => {
    permissions.current = MEMBER
    render(<PluginsManager listings={[listing()]} />)

    const scope = within(card())
    expect(scope.queryByRole('switch', { name: 'orgInstalled' })).not.toBeInTheDocument()
    expect(scope.queryByRole('switch', { name: 'orgEnabled' })).not.toBeInTheDocument()
    expect(scope.getByRole('switch', { name: 'userRun' })).toBeInTheDocument()
    expect(scope.getByText('orgReadOnlyOnOptional')).toBeInTheDocument()
  })

  it('gives a viewer no switches at all, not even their own', () => {
    permissions.current = VIEWER
    render(<PluginsManager listings={[listing()]} />)

    const scope = within(card())
    expect(scope.queryByRole('switch')).not.toBeInTheDocument()
    expect(scope.getByText('userReadOnly')).toBeInTheDocument()
  })

  it('tells a viewer they are read-only rather than blaming an admin lock', () => {
    // Not the admin-lock message: nothing is locked, the reader just cannot change it.
    permissions.current = VIEWER
    render(<PluginsManager listings={[listing({ allowUserOverride: true })]} />)

    const scope = within(card())
    expect(scope.queryByText('userLockedOn')).not.toBeInTheDocument()
    expect(scope.getByText('userReadOnly')).toBeInTheDocument()
  })

  it('replaces the personal switch with an explanation when an admin locked it', () => {
    permissions.current = MEMBER
    render(<PluginsManager listings={[listing({ allowUserOverride: false })]} />)

    const scope = within(card())
    expect(scope.queryByRole('switch', { name: 'userRun' })).not.toBeInTheDocument()
    expect(scope.getByText('userLockedOn')).toBeInTheDocument()
  })

  it('hides the "found on this server" section from anyone who cannot install', () => {
    permissions.current = MEMBER
    render(<PluginsManager listings={[listing({ status: 'available', installed: false })]} />)

    expect(screen.queryByText('sectionFound')).not.toBeInTheDocument()
    expect(screen.queryByTestId('plugin-space-planning')).not.toBeInTheDocument()
  })

  it('lets an admin remove a bundled plugin, which ships in the build but is not forced on', async () => {
    permissions.current = ADMIN
    const setInstalled = vi.fn().mockResolvedValue(undefined)
    const actions: PluginsActions = { ...boundActions, setInstalled }
    render(<PluginsManager listings={[listing({ bundled: true })]} actions={actions} />)

    const scope = within(card())
    const installed = scope.getByRole('switch', { name: 'orgInstalled' })
    expect(installed).toBeEnabled()

    installed.click()

    await vi.waitFor(() => expect(setInstalled).toHaveBeenCalledWith('space-planning', false))
    // Back to the section it came from, rather than stuck in the organization's list.
    expect(within(card()).getByText('statusAvailable')).toBeInTheDocument()
  })

  it('shows an admin the trust prompt before they add a discovered plugin', () => {
    permissions.current = ADMIN
    render(<PluginsManager listings={[listing({
      status: 'available',
      installed: false,
      mountPath: '/app/plugins/space-planning',
      manifest: { ...listing().manifest, requiredPermissions: ['read Building'] },
    })]} />)

    const scope = within(card())
    expect(scope.getByText('trustHeading')).toBeInTheDocument()
    expect(scope.getByText('trustWarning')).toBeInTheDocument()
    expect(scope.getByRole('button', { name: 'addToOrg' })).toBeInTheDocument()
  })
})

describe('failed plugins', () => {
  it('surfaces the host error message instead of hiding it in the console', () => {
    permissions.current = MEMBER
    render(<PluginsManager listings={[listing({
      status: 'error',
      error: 'Plugin "space-planning" targets plugin host API 2, but this version of @collabdt/core provides 1',
    })]} />)

    const scope = within(card())
    expect(scope.getByText('errorHeading')).toBeInTheDocument()
    expect(scope.getByText(/targets plugin host API 2/)).toBeInTheDocument()
    expect(scope.queryByRole('switch', { name: 'userRun' })).not.toBeInTheDocument()
    expect(scope.getByText('userNothingToRun')).toBeInTheDocument()
  })
})

describe('toasts', () => {
  it('moves the switch before the write resolves, so it never feels laggy', async () => {
    permissions.current = MEMBER
    let resolveWrite: () => void = () => {}
    const actions: PluginsActions = {
      setInstalled: vi.fn(),
      setOrgEnabled: vi.fn(),
      setAllowUserOverride: vi.fn(),
      setUserEnabled: vi.fn().mockReturnValue(new Promise<void>(resolve => {
        resolveWrite = resolve
      })),
    }
    render(<PluginsManager listings={[listing({ userEnabled: false })]} actions={actions} />)

    within(card()).getByRole('switch', { name: 'userRun' }).click()

    // Still in flight, but the control has already answered the user.
    await vi.waitFor(() => expect(
      within(card()).getByRole('switch', { name: 'userRun' }),
    ).toHaveAttribute('aria-checked', 'true'))
    expect(toast.success).not.toHaveBeenCalled()

    resolveWrite()
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('toastUserEnabled'))
  })

  it('reverts the switch when the write fails, so it never looks saved', async () => {
    permissions.current = MEMBER
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const actions: PluginsActions = {
      setInstalled: vi.fn(),
      setOrgEnabled: vi.fn(),
      setAllowUserOverride: vi.fn(),
      setUserEnabled: vi.fn().mockRejectedValue(new Error('503')),
    }
    render(<PluginsManager listings={[listing({ userEnabled: false })]} actions={actions} />)

    within(card()).getByRole('switch', { name: 'userRun' }).click()

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(within(card()).getByRole('switch', { name: 'userRun' }))
      .toHaveAttribute('aria-checked', 'false')
    consoleSpy.mockRestore()
  })

  it('confirms a saved change', async () => {
    permissions.current = MEMBER
    const setUserEnabled = vi.fn().mockResolvedValue(undefined)
    const actions: PluginsActions = {
      setInstalled: vi.fn().mockResolvedValue(undefined),
      setOrgEnabled: vi.fn().mockResolvedValue(undefined),
      setAllowUserOverride: vi.fn().mockResolvedValue(undefined),
      setUserEnabled,
    }
    render(<PluginsManager listings={[listing({ userEnabled: false })]} actions={actions} />)

    within(card()).getByRole('switch', { name: 'userRun' }).click()

    await vi.waitFor(() => expect(setUserEnabled).toHaveBeenCalledWith('space-planning', true))
    expect(toast.success).toHaveBeenCalledWith('toastUserEnabled')
  })

  it('reports a failed write instead of leaving the switch looking successful', async () => {
    permissions.current = MEMBER
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const actions: PluginsActions = {
      setInstalled: vi.fn(),
      setOrgEnabled: vi.fn(),
      setAllowUserOverride: vi.fn(),
      setUserEnabled: vi.fn().mockRejectedValue(new Error('503')),
    }
    render(<PluginsManager listings={[listing({ userEnabled: false })]} actions={actions} />)

    within(card()).getByRole('switch', { name: 'userRun' }).click()

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('toastFailed'))
    expect(toast.success).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
