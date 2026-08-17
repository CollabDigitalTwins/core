// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'

import { ViewerNames } from '../../types/dbTypes'
import { PLUGIN_HOST_API } from '../sdk/version'

import { PluginHostProvider } from './provider'
import { usePluginViewerTabs } from './usePluginViewerTabs'

import type { PluginManifest, PluginSource } from '../sdk/types'

vi.mock('next-intl', () => ({
  useMessages: () => ({}),
  useTranslations: () => (key: string) => key,
}))

function makeSource(slug: string, viewers?: ViewerNames[]): PluginSource {
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
        ctx.register('viewer.tabs', {
          id: 'panel',
          labelKey: `${slug} panel`,
          icon: 'Zap',
          ...(viewers ? { viewers } : {}),
          component: () => <p>{`${slug} body`}</p>,
        })
      },
    },
  }
}

/** Renders each resolved tab's id and label, so assertions read off the DOM. */
function TabProbe({ viewer }: { viewer: ViewerNames }) {
  const tabs = usePluginViewerTabs(viewer)

  return (
    <ul>
      {tabs.map(tab => (
        <li key={tab.id} data-testid={tab.id}>
          {tab.meta?.label}
          {tab.content}
        </li>
      ))}
    </ul>
  )
}

const renderFor = (plugins: PluginSource[], viewer: ViewerNames) =>
  render(
    <PluginHostProvider plugins={plugins}>
      <TabProbe viewer={viewer} />
    </PluginHostProvider>,
  )

describe('usePluginViewerTabs', () => {
  it('shows a tab targeted at this viewer', async () => {
    renderFor([makeSource('bim-only', [ViewerNames.bim])], ViewerNames.bim)
    expect(await screen.findByText('bim-only panel')).toBeInTheDocument()
  })

  it('hides a tab targeted at another viewer', async () => {
    renderFor([makeSource('bim-only', [ViewerNames.bim])], ViewerNames.map)
    await waitFor(() => expect(screen.queryByText('bim-only panel')).not.toBeInTheDocument())
  })

  // Omitting `viewers` is the "everywhere" case, which is what the type's doc promises.
  it.each([ViewerNames.map, ViewerNames.bim, ViewerNames.pointcloud])(
    'shows an untargeted tab in %s',
    async (viewer) => {
      renderFor([makeSource('everywhere')], viewer)
      expect(await screen.findByText('everywhere panel')).toBeInTheDocument()
    },
  )

  it.each([ViewerNames.bim, ViewerNames.map])(
    'shows a tab listing several viewers in %s',
    async (viewer) => {
      renderFor([makeSource('two', [ViewerNames.bim, ViewerNames.map])], viewer)
      expect(await screen.findByText('two panel')).toBeInTheDocument()
    },
  )

  it('hides a tab listing several viewers from one it does not name', async () => {
    renderFor([makeSource('two', [ViewerNames.bim, ViewerNames.map])], ViewerNames.pointcloud)
    await waitFor(() => expect(screen.queryByText('two panel')).not.toBeInTheDocument())
  })

  it('namespaces the tab id by plugin, so two plugins cannot collide', async () => {
    renderFor([makeSource('alpha'), makeSource('beta')], ViewerNames.bim)

    expect(await screen.findByTestId('plugin:alpha:panel')).toBeInTheDocument()
    expect(screen.getByTestId('plugin:beta:panel')).toBeInTheDocument()
  })

  it('renders the panel inside the plugin scope', async () => {
    renderFor([makeSource('alpha')], ViewerNames.bim)
    expect(await screen.findByText('alpha body')).toBeInTheDocument()
  })
})
