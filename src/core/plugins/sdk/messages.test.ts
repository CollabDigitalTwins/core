// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { collectPluginMessages } from '../messages'

import { __lookupPluginMessage as lookup } from './messages'

// The resolution order this guards: plugin catalog → manifest literal. A plugin
// shipped with no translations, or with a locale missing a key, must never render
// a raw message key at the user.

const messages = {
  Extensions: { title: 'Extensions' },
  plugins: {
    'space-planning': {
      name: 'Planification des espaces',
      description: '',
      spaces: { title: 'Espaces' },
    },
  },
}

describe('plugin message lookup', () => {
  it('finds a translated string the plugin shipped', () => {
    expect(lookup(messages, 'space-planning', 'name')).toBe('Planification des espaces')
  })

  it('resolves a dotted key into a nested group', () => {
    expect(lookup(messages, 'space-planning', 'spaces.title')).toBe('Espaces')
  })

  it('misses when the plugin ships no catalog at all', () => {
    expect(lookup(messages, 'daylight-cycle', 'name')).toBeUndefined()
  })

  it('misses when the catalog exists but lacks the key', () => {
    expect(lookup(messages, 'space-planning', 'author')).toBeUndefined()
  })

  it('treats an empty string as missing, so the manifest wins', () => {
    // A half-filled catalog is a real failure mode: the key is present but blank,
    // which would otherwise render nothing where a name should be.
    expect(lookup(messages, 'space-planning', 'description')).toBeUndefined()
  })

  it('misses on a key that resolves to a group rather than a string', () => {
    expect(lookup(messages, 'space-planning', 'spaces')).toBeUndefined()
  })

  it('misses when there are no plugin messages at all', () => {
    expect(lookup({ Extensions: {} }, 'space-planning', 'name')).toBeUndefined()
  })

  it('misses when the whole message tree is absent', () => {
    expect(lookup(undefined, 'space-planning', 'name')).toBeUndefined()
  })

  it('cannot be used to read another plugin\'s namespace', () => {
    expect(lookup(messages, 'other-plugin', 'name')).toBeUndefined()
  })
})

// Strings live in the manifest so a plugin is one file to write and one to
// translate. This is the re-key from manifest shape into catalog shape.
describe('collecting manifest messages', () => {
  it('re-keys locale-then-key into locale-then-slug-then-key', () => {
    const collected = collectPluginMessages([
      { slug: 'a', messages: { en: { title: 'A' }, fr: { title: 'Ah' } } },
    ])

    expect(collected).toEqual({
      en: { a: { title: 'A' } },
      fr: { a: { title: 'Ah' } },
    })
  })

  it('keeps plugins in separate namespaces within a locale', () => {
    const collected = collectPluginMessages([
      { slug: 'a', messages: { en: { title: 'A' } } },
      { slug: 'b', messages: { en: { title: 'B' } } },
    ])

    expect(collected.en).toEqual({ a: { title: 'A' }, b: { title: 'B' } })
  })

  it('skips a plugin that ships no messages', () => {
    const collected = collectPluginMessages([
      { slug: 'quiet' },
      { slug: 'loud', messages: { en: { title: 'Loud' } } },
    ])

    expect(collected.en).toEqual({ loud: { title: 'Loud' } })
  })

  it('collects a locale only from the plugins that translated it', () => {
    const collected = collectPluginMessages([
      { slug: 'a', messages: { en: { title: 'A' }, fr: { title: 'Ah' } } },
      { slug: 'b', messages: { en: { title: 'B' } } },
    ])

    expect(Object.keys(collected.fr)).toEqual(['a'])
  })

  it('resolves end to end against the lookup the SDK uses', () => {
    const collected = collectPluginMessages([
      { slug: 'space-planning', messages: { en: { spaces: { title: 'Spaces' } } } },
    ])

    expect(lookup({ plugins: collected.en }, 'space-planning', 'spaces.title')).toBe('Spaces')
  })
})
