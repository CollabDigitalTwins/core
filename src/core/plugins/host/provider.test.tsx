// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'

import { PLUGIN_HOST_API } from '../sdk/version'

import { PluginHostProvider, usePluginContributions } from './provider'

import type { PluginManifest, PluginSource } from '../sdk/types'

function makeSource(slug: string, label = slug): PluginSource {
  return {
    manifest: {
      slug,
      name: slug,
      version: '1.0.0',
      hostApi: PLUGIN_HOST_API,
      capabilities: ['sidebar.items'],
    } satisfies PluginManifest,
    entry: {
      activate(ctx) {
        ctx.register('sidebar.items', { id: `${slug}-item`, label, icon: 'Zap', component: () => null })
      },
    },
  }
}

/** Renders the label of every registered sidebar item, so assertions read off the DOM. */
function SidebarProbe() {
  const items = usePluginContributions('sidebar.items')
  return <ul>{items.map(i => <li key={i.id}>{i.label}</li>)}</ul>
}

test('loads the plugins passed via the plugins prop', async () => {
  const plugins = [makeSource('alpha', 'Alpha')]

  render(
    <PluginHostProvider plugins={plugins}>
      <SidebarProbe />
    </PluginHostProvider>,
  )

  expect(await screen.findByText('Alpha')).toBeInTheDocument()
})

test('resolves an async plugin source and renders its late registrations', async () => {
  const plugins = [makeSource('remote', 'Remote')]
  const source = () => Promise.resolve(plugins)

  render(
    <PluginHostProvider plugins={source}>
      <SidebarProbe />
    </PluginHostProvider>,
  )

  // Nothing is registered on first paint — this is the case a non-subscribing
  // consumer would miss entirely.
  expect(screen.queryByText('Remote')).not.toBeInTheDocument()
  expect(await screen.findByText('Remote')).toBeInTheDocument()
})

test('activates only the slugs listed in enabledSlugs', async () => {
  const plugins = [makeSource('on', 'On'), makeSource('off', 'Off')]

  render(
    <PluginHostProvider plugins={plugins} enabledSlugs={['on']}>
      <SidebarProbe />
    </PluginHostProvider>,
  )

  expect(await screen.findByText('On')).toBeInTheDocument()
  expect(screen.queryByText('Off')).not.toBeInTheDocument()
})

test('deactivates a plugin removed from enabledSlugs without a reload', async () => {
  const plugins = [makeSource('toggle', 'Toggle')]

  function Harness() {
    const [slugs, setSlugs] = React.useState<string[]>(['toggle'])
    return (
      <>
        <button onClick={() => setSlugs([])}>disable</button>
        <PluginHostProvider plugins={plugins} enabledSlugs={slugs}>
          <SidebarProbe />
        </PluginHostProvider>
      </>
    )
  }

  render(<Harness />)
  expect(await screen.findByText('Toggle')).toBeInTheDocument()

  screen.getByRole('button', { name: 'disable' }).click()

  await waitFor(() => expect(screen.queryByText('Toggle')).not.toBeInTheDocument())
})

test('passes per-plugin config through to ctx.config', async () => {
  let seen: Record<string, unknown> | null = null
  const plugins: PluginSource[] = [{
    manifest: {
      slug: 'configured',
      name: 'Configured',
      version: '1.0.0',
      hostApi: PLUGIN_HOST_API,
      capabilities: ['sidebar.items'],
    },
    entry: {
      activate(ctx) {
        seen = ctx.config
        ctx.register('sidebar.items', { id: 'c', label: 'Configured', icon: 'Zap', component: () => null })
      },
    },
  }]

  render(
    <PluginHostProvider plugins={plugins} configs={{ configured: { apiKey: 'secret' } }}>
      <SidebarProbe />
    </PluginHostProvider>,
  )

  await screen.findByText('Configured')
  expect(seen).toEqual({ apiKey: 'secret' })
})

test('a plugin that throws during activation does not stop the next one', async () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const plugins: PluginSource[] = [
    {
      manifest: {
        slug: 'broken',
        name: 'Broken',
        version: '1.0.0',
        hostApi: PLUGIN_HOST_API,
        capabilities: ['sidebar.items'],
      },
      entry: { activate() { throw new Error('boom') } },
    },
    makeSource('healthy', 'Healthy'),
  ]

  render(
    <PluginHostProvider plugins={plugins}>
      <SidebarProbe />
    </PluginHostProvider>,
  )

  expect(await screen.findByText('Healthy')).toBeInTheDocument()
  consoleSpy.mockRestore()
})
