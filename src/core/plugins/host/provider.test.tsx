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
      capabilities: ['viewer.tabs'],
    } satisfies PluginManifest,
    entry: {
      activate(ctx) {
        ctx.register('viewer.tabs', { id: `${slug}-item`, labelKey: label, icon: 'Zap', component: () => null })
      },
    },
  }
}

/** Renders the label of every registered viewer tab, so assertions read off the DOM. */
function TabProbe() {
  const tabs = usePluginContributions('viewer.tabs')
  return <ul>{tabs.map(t => <li key={t.id}>{t.labelKey}</li>)}</ul>
}

test('loads the plugins passed via the plugins prop', async () => {
  const plugins = [makeSource('alpha', 'Alpha')]

  render(
    <PluginHostProvider plugins={plugins}>
      <TabProbe />
    </PluginHostProvider>,
  )

  expect(await screen.findByText('Alpha')).toBeInTheDocument()
})

test('resolves an async plugin source and renders its late registrations', async () => {
  const plugins = [makeSource('remote', 'Remote')]
  const source = () => Promise.resolve(plugins)

  render(
    <PluginHostProvider plugins={source}>
      <TabProbe />
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
      <TabProbe />
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
          <TabProbe />
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
      capabilities: ['viewer.tabs'],
    },
    entry: {
      activate(ctx) {
        seen = ctx.config
        ctx.register('viewer.tabs', { id: 'c', labelKey: 'Configured', icon: 'Zap', component: () => null })
      },
    },
  }]

  render(
    <PluginHostProvider plugins={plugins} configs={{ configured: { apiKey: 'secret' } }}>
      <TabProbe />
    </PluginHostProvider>,
  )

  await screen.findByText('Configured')
  expect(seen).toEqual({ apiKey: 'secret' })
})

test('accepts a lazily-imported entry, so a plugin ships in its own chunk', async () => {
  // Compiled-in plugins are dynamic imports: a static one would pull every
  // plugin's components — and @thatopen for a BIM plugin — into the eager bundle.
  const source = makeSource('lazy', 'Lazy')
  let imported = false

  render(
    <PluginHostProvider plugins={[{
      manifest: source.manifest,
      entry: () => {
        imported = true
        return Promise.resolve(source.entry)
      },
    }]}>
      <TabProbe />
    </PluginHostProvider>,
  )

  expect(await screen.findByText('Lazy')).toBeInTheDocument()
  expect(imported).toBe(true)
})

test('a chunk that fails to import does not stop the plugins after it', async () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  render(
    <PluginHostProvider plugins={[
      {
        manifest: makeSource('missing').manifest,
        entry: () => Promise.reject(new Error('chunk load failed')),
      },
      makeSource('healthy', 'Healthy'),
    ]}>
      <TabProbe />
    </PluginHostProvider>,
  )

  expect(await screen.findByText('Healthy')).toBeInTheDocument()
  consoleSpy.mockRestore()
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
        capabilities: ['viewer.tabs'],
      },
      entry: { activate() { throw new Error('boom') } },
    },
    makeSource('healthy', 'Healthy'),
  ]

  render(
    <PluginHostProvider plugins={plugins}>
      <TabProbe />
    </PluginHostProvider>,
  )

  expect(await screen.findByText('Healthy')).toBeInTheDocument()
  consoleSpy.mockRestore()
})
