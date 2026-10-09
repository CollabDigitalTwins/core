// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { collectRuntimeMessages, RuntimePluginMessagesContext } from '../host/runtimeMessages'

import { usePluginMessageLookup } from './messages'

const locale = vi.hoisted(() => ({ current: 'fr' }))
vi.mock('next-intl', () => ({
  useLocale: () => locale.current,
  useMessages: () => ({ plugins: { compiled: { title: 'From the catalog' } } }),
  useTranslations: () => (key: string) => key,
}))

const runtime = collectRuntimeMessages([
  { slug: 'mounted', messages: { en: { title: 'Space planner', only: 'English only' }, fr: { title: 'Planificateur' } } },
  { slug: 'bare' },
  null,
])

function renderLookup() {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RuntimePluginMessagesContext.Provider value={runtime}>{children}</RuntimePluginMessagesContext.Provider>
  )
  return renderHook(() => usePluginMessageLookup(), { wrapper }).result.current
}

describe('plugin messages from a runtime-loaded manifest', () => {
  it('resolves a mounted plugin\'s key in the active locale, then English, before the fallback', () => {
    const lookup = renderLookup()
    expect(lookup('mounted', 'title', 'title')).toBe('Planificateur')
    expect(lookup('mounted', 'only', 'only')).toBe('English only')
    expect(lookup('mounted', 'missing', 'missing')).toBe('missing')
    expect(lookup('bare', 'title', 'title')).toBe('title')
  })

  it('still prefers the compiled catalog', () => {
    expect(renderLookup()('compiled', 'title', 'title')).toBe('From the catalog')
  })
})
