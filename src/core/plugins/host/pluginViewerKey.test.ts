// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { parsePluginViewerKey, pluginViewerKey } from './pluginViewerKey'

describe('pluginViewerKey', () => {
  it('round-trips a plugin and page id', () => {
    expect(parsePluginViewerKey(pluginViewerKey('room-inventory', 'rooms'))).toEqual({
      pluginId: 'room-inventory',
      pageId: 'rooms',
    })
  })

  it('keeps a page id containing a colon whole', () => {
    expect(parsePluginViewerKey(pluginViewerKey('a', 'b:c'))).toEqual({
      pluginId: 'a',
      pageId: 'b:c',
    })
  })
})

// The value arrives from the URL, so anything can appear here. Every rejection has to be a
// null the caller falls back on, never a throw that takes the page down.
describe('parsePluginViewerKey rejects', () => {
  it.each([
    ['a built-in viewer', 'buildings'],
    ['the prefix alone', 'plugin:'],
    ['a plugin id with no page', 'plugin:room-inventory'],
    ['an empty plugin id', 'plugin::rooms'],
    ['an empty page id', 'plugin:room-inventory:'],
    ['an empty string', ''],
  ])('%s', (_case, key) => {
    expect(parsePluginViewerKey(key)).toBeNull()
  })

  it('a missing value', () => {
    expect(parsePluginViewerKey(null)).toBeNull()
    expect(parsePluginViewerKey(undefined)).toBeNull()
  })
})
