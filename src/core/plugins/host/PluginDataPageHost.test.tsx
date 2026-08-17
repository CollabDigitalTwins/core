// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'

import { PLUGIN_HOST_API } from '../sdk/version'

import { PluginDataPageHost } from './PluginDataPageHost'
import { pluginViewerKey } from './pluginViewerKey'
import { PluginHostProvider } from './provider'

import type { DataPageRegistration, PluginManifest, PluginSource } from '../sdk/types'

vi.mock('next-intl', () => ({
  useMessages: () => ({}),
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}))

interface Room extends Record<string, unknown> {
  key: string
  name: string
  floor: string
}

const ROOMS: Room[] = [
  { key: 'r1', name: 'Atrium', floor: 'Ground' },
  { key: 'r2', name: 'Lab', floor: 'Second' },
]

function makeSource(
  slug: string,
  overrides: Partial<DataPageRegistration<Room>> = {},
  rows: Room[] = ROOMS,
): PluginSource {
  return {
    manifest: {
      slug,
      name: slug,
      version: '1.0.0',
      hostApi: PLUGIN_HOST_API,
      capabilities: ['data.pages'],
    } satisfies PluginManifest,
    entry: {
      activate(ctx) {
        ctx.register('data.pages', {
          id: 'rooms',
          titleKey: `${slug} rooms`,
          icon: 'Table',
          useRows: () => ({ rows }),
          columns: [
            { key: 'name', labelKey: 'Name' },
            { key: 'floor', labelKey: 'Floor' },
          ],
          ...overrides,
        } as DataPageRegistration)
      },
    },
  }
}

const renderPage = (plugins: PluginSource[], viewer: string) =>
  render(
    <PluginHostProvider plugins={plugins}>
      <PluginDataPageHost viewer={viewer as never} />
    </PluginHostProvider>,
  )

describe('PluginDataPageHost', () => {
  it('renders the page core owns around the plugin\'s rows', async () => {
    renderPage([makeSource('rooms-plugin')], pluginViewerKey('rooms-plugin', 'rooms'))

    expect(await screen.findByRole('heading', { name: 'rooms-plugin rooms' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByText('Atrium')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })

  // The key comes from the URL, so it can name anything at all.
  it.each([
    ['an unknown page id', 'plugin:rooms-plugin:missing'],
    ['an unknown plugin', 'plugin:not-installed:rooms'],
    ['a malformed key', 'plugin:'],
    ['a built-in viewer', 'buildings'],
  ])('renders nothing for %s', async (_case, viewer) => {
    const { container } = renderPage([makeSource('rooms-plugin')], viewer)
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('filters rows with the search box', async () => {
    renderPage([makeSource('rooms-plugin')], pluginViewerKey('rooms-plugin', 'rooms'))

    const search = await screen.findByRole('textbox')
    fireEvent.change(search, { target: { value: 'atri' } })

    expect(screen.getByText('Atrium')).toBeInTheDocument()
    expect(screen.queryByText('Lab')).not.toBeInTheDocument()
  })

  it('restricts the search to searchKeys when the plugin names them', async () => {
    renderPage(
      [makeSource('rooms-plugin', { searchKeys: ['name'] })],
      pluginViewerKey('rooms-plugin', 'rooms'),
    )

    const search = await screen.findByRole('textbox')
    fireEvent.change(search, { target: { value: 'Ground' } })

    // 'Ground' is a floor, not a name, so nothing matches.
    expect(screen.queryByText('Atrium')).not.toBeInTheDocument()
  })

  // onRowClick comes from the rows hook, so it can close over usePluginDialogs.
  it('calls the onRowClick the rows hook returned', async () => {
    const onRowClick = vi.fn()
    renderPage(
      [makeSource('rooms-plugin', { useRows: () => ({ rows: ROOMS, onRowClick }) })],
      pluginViewerKey('rooms-plugin', 'rooms'),
    )

    fireEvent.click(await screen.findByRole('button', { name: /Atrium/ }))
    expect(onRowClick).toHaveBeenCalledWith(ROOMS[0])
  })

  it('leaves rows non-interactive when the plugin gave them nothing to do', async () => {
    renderPage([makeSource('rooms-plugin')], pluginViewerKey('rooms-plugin', 'rooms'))

    await screen.findByText('Atrium')
    expect(screen.queryByRole('button', { name: /Atrium/ })).not.toBeInTheDocument()
  })

  it('renders a plugin cell renderer', async () => {
    renderPage(
      [makeSource('rooms-plugin', {
        columns: [{ key: 'name', labelKey: 'Name', render: row => <em>{`~${String(row.name)}~`}</em> }],
      })],
      pluginViewerKey('rooms-plugin', 'rooms'),
    )

    expect(await screen.findByText('~Atrium~')).toBeInTheDocument()
  })

  it('shows the empty state when the plugin has no rows', async () => {
    renderPage(
      [makeSource('rooms-plugin', {}, [])],
      pluginViewerKey('rooms-plugin', 'rooms'),
    )

    expect(await screen.findByText('empty')).toBeInTheDocument()
  })
})
