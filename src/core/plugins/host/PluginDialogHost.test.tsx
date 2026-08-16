// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'

import { usePluginDialogs } from '../sdk/ui'
import { PLUGIN_HOST_API } from '../sdk/version'

import { PluginDialogHost } from './PluginDialogHost'
import { PluginHostProvider } from './provider'
import { PluginScopeProvider } from './scope'

import type { PluginManifest, PluginSource } from '../sdk/types'

// The dialog title is looked up in the merged catalog and falls back to the key, which is
// what these assertions read. next-intl needs no real messages for that path.
vi.mock('next-intl', () => ({
  useMessages: () => ({}),
  useTranslations: () => (key: string) => key,
}))

function makeSource(slug: string, dialogId = 'detail'): PluginSource {
  return {
    manifest: {
      slug,
      name: slug,
      version: '1.0.0',
      hostApi: PLUGIN_HOST_API,
      capabilities: ['ui.dialogs'],
    } satisfies PluginManifest,
    entry: {
      activate(ctx) {
        ctx.register('ui.dialogs', {
          id: dialogId,
          titleKey: `${slug}-title`,
          component: ({ close, subject }: { close: () => void; subject?: string }) => (
            <div>
              <p>{`body of ${slug}`}</p>
              {subject !== undefined && <p>{`subject: ${String(subject)}`}</p>}
              <button type="button" onClick={close}>done</button>
            </div>
          ),
        })
      },
    },
  }
}

interface OpenerProps {
  pluginId: string
  dialogId?: string
  props?: Record<string, unknown>
}

/** A plugin surface: it can only address its own dialogs, because the scope names it. */
function ScopedOpener({ pluginId, ...rest }: OpenerProps) {
  return (
    <PluginScopeProvider pluginId={pluginId}>
      <OpenerBody {...rest} />
    </PluginScopeProvider>
  )
}

// usePluginDialogs reads the scope, so the hook runs inside it rather than above it.
function OpenerBody({ dialogId = 'detail', props }: Omit<OpenerProps, 'pluginId'>) {
  const { open } = usePluginDialogs()

  return <button type="button" onClick={() => open(dialogId, props)}>open</button>
}

function renderHost(plugins: PluginSource[], children: React.ReactNode) {
  return render(
    <PluginHostProvider plugins={plugins}>
      {children}
      <PluginDialogHost />
    </PluginHostProvider>,
  )
}

describe('plugin dialogs', () => {
  it('opens a registered dialog by id', async () => {
    renderHost([makeSource('alpha')], <ScopedOpener pluginId="alpha" />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'open' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'open' }))

    expect(await screen.findByText('body of alpha')).toBeInTheDocument()
    expect(screen.getByText('alpha-title')).toBeInTheDocument()
  })

  it('passes the props the caller supplied', async () => {
    renderHost(
      [makeSource('alpha')],
      <ScopedOpener pluginId="alpha" props={{ subject: 'room-7' }} />,
    )

    await waitFor(() => expect(screen.getByRole('button', { name: 'open' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'open' }))

    expect(await screen.findByText('subject: room-7')).toBeInTheDocument()
  })

  it('closes from inside the dialog', async () => {
    renderHost([makeSource('alpha')], <ScopedOpener pluginId="alpha" />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'open' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'open' }))
    fireEvent.click(await screen.findByRole('button', { name: 'done' }))

    await waitFor(() => expect(screen.queryByText('body of alpha')).not.toBeInTheDocument())
  })

  // The whole reason the host owns dialogs rather than the plugin: a dialog opened from a
  // map tool's panel has to survive that panel closing.
  it('stays open when the surface that opened it unmounts', async () => {
    const plugins = [makeSource('alpha')]

    // Rerendered rather than toggled by a button: an open Radix dialog marks the rest of the
    // page aria-hidden, so a control behind it is genuinely unreachable — as it should be.
    const { rerender } = renderHost(plugins, <ScopedOpener pluginId="alpha" />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'open' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'open' }))
    expect(await screen.findByText('body of alpha')).toBeInTheDocument()

    rerender(
      <PluginHostProvider plugins={plugins}>
        <PluginDialogHost />
      </PluginHostProvider>,
    )

    expect(screen.queryByRole('button', { name: 'open', hidden: true })).not.toBeInTheDocument()
    expect(screen.getByText('body of alpha')).toBeInTheDocument()
  })

  // The same isolation property usePluginStore has: the id comes from the scope the host
  // established, so naming another plugin's dialog id addresses nothing.
  it('cannot open another plugin\'s dialog', async () => {
    renderHost(
      [makeSource('alpha', 'alpha-only'), makeSource('beta', 'beta-only')],
      <ScopedOpener pluginId="alpha" dialogId="beta-only" />,
    )

    await waitFor(() => expect(screen.getByRole('button', { name: 'open' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'open' }))

    // alpha asked for beta's dialog id. Nothing matches (alpha, beta-only), so nothing opens.
    await waitFor(() => expect(screen.queryByText('body of beta')).not.toBeInTheDocument())
    expect(screen.queryByText('body of alpha')).not.toBeInTheDocument()
  })

  it('renders nothing for a dialog id that was never registered', async () => {
    renderHost([makeSource('alpha')], <ScopedOpener pluginId="alpha" dialogId="missing" />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'open' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'open' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
