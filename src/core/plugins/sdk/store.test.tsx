// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import * as React from 'react'

import { PluginScopeProvider } from '../host/scope'

import { usePluginStore } from './store'

/**
 * The scoping guarantee is what these cover: a plugin never passes its own id or
 * an organization id, so it cannot address another plugin's namespace or another
 * tenant's data even deliberately.
 */
const { calls, records } = vi.hoisted(() => ({
  calls: [] as Array<{ method: string; args: unknown[] }>,
  records: { current: [] as Array<{ key: string; data: unknown; updatedAt: string }> },
}))

vi.mock('../../hooks/provider', () => ({
  useCoreHooks: () => ({
    plugin: {
      usePluginRecords: (pluginId: string, collection: string) => {
        calls.push({ method: 'list', args: [pluginId, collection] })
        return {
          records: records.current,
          isLoading: false,
          isError: undefined,
          put: (key: string, data: unknown) => {
            calls.push({ method: 'put', args: [pluginId, collection, key, data] })
            return Promise.resolve()
          },
          remove: (key: string) => {
            calls.push({ method: 'remove', args: [pluginId, collection, key] })
            return Promise.resolve()
          },
        }
      },
    },
  }),
}))

function Probe({ collection = 'spaces' }: { collection?: string }) {
  const store = usePluginStore<{ programme: string }>(collection)

  return (
    <div>
      <span data-testid="count">{store.items.length}</span>
      <span data-testid="found">{store.get('room-1')?.data.programme ?? 'none'}</span>
      <button onClick={() => void store.put('room-1', { programme: 'Office' })}>save</button>
      <button onClick={() => void store.remove('room-1')}>delete</button>
    </div>
  )
}

function renderScoped(pluginId: string, collection?: string) {
  render(
    <PluginScopeProvider pluginId={pluginId}>
      <Probe collection={collection} />
    </PluginScopeProvider>,
  )
}

afterEach(() => {
  calls.length = 0
  records.current = []
})

test('reads the calling plugin\'s namespace, taken from the scope', () => {
  renderScoped('space-planning')

  expect(calls[0]).toEqual({ method: 'list', args: ['space-planning', 'spaces'] })
})

test('a different plugin in the same collection reads a different namespace', () => {
  renderScoped('other-plugin')

  expect(calls[0].args[0]).toBe('other-plugin')
})

test('keeps collections separate within one plugin', () => {
  renderScoped('space-planning', 'furniture')

  expect(calls[0]).toEqual({ method: 'list', args: ['space-planning', 'furniture'] })
})

test('writes carry the scope, so a plugin cannot address another namespace', () => {
  renderScoped('space-planning')

  screen.getByRole('button', { name: 'save' }).click()

  expect(calls.at(-1)).toEqual({
    method: 'put',
    args: ['space-planning', 'spaces', 'room-1', { programme: 'Office' }],
  })
})

test('deletes carry the scope too', () => {
  renderScoped('space-planning')

  screen.getByRole('button', { name: 'delete' }).click()

  expect(calls.at(-1)).toEqual({
    method: 'remove',
    args: ['space-planning', 'spaces', 'room-1'],
  })
})

test('exposes stored documents and looks them up by key', () => {
  records.current = [
    { key: 'room-1', data: { programme: 'Office' }, updatedAt: '2026-08-10T00:00:00Z' },
    { key: 'room-2', data: { programme: 'Lab' }, updatedAt: '2026-08-10T00:00:00Z' },
  ]

  renderScoped('space-planning')

  expect(screen.getByTestId('count')).toHaveTextContent('2')
  expect(screen.getByTestId('found')).toHaveTextContent('Office')
})

test('returns undefined for a key that was never written', () => {
  renderScoped('space-planning')

  expect(screen.getByTestId('found')).toHaveTextContent('none')
})

test('refuses to work outside a plugin, rather than sharing one namespace', () => {
  // Without a scope there is no namespace to use, and defaulting to a shared one
  // would silently mix plugins' data together.
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  expect(() => render(<Probe />)).toThrow(/only available inside a plugin component/)

  consoleSpy.mockRestore()
})
