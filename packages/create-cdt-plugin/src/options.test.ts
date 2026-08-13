// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { DEFAULT_KIT_SPEC, parseFlags, slugFromName, SURFACES } from './options'

describe('SURFACES', () => {
  it('offers exactly the four capabilities core renders', () => {
    expect([...SURFACES]).toEqual(['map.tools', 'bim.tools', 'pointcloud.tools', 'map.legends'])
  })

  it('never offers a capability nothing renders', () => {
    expect(SURFACES).not.toContain('sidebar.items')
    expect(SURFACES).not.toContain('viewer.panels')
  })
})

describe('slugFromName', () => {
  it('lowercases and hyphenates', () => {
    expect(slugFromName('Room Inventory')).toBe('room-inventory')
  })

  it('strips characters a slug may not contain', () => {
    expect(slugFromName('Rooms & Spaces (v2)')).toBe('rooms-spaces-v2')
  })

  it('collapses runs of separators rather than emitting empty segments', () => {
    expect(slugFromName('A   B')).toBe('a-b')
    expect(slugFromName('-Leading and trailing-')).toBe('leading-and-trailing')
  })
})

describe('parseFlags', () => {
  it('reads every documented flag', () => {
    const options = parseFlags([
      '--mode', 'builtin',
      '--name', 'Room Inventory',
      '--slug', 'room-inventory',
      '--surface', 'bim.tools',
      '--body', 'empty',
      '--author', 'Nico',
      '--description', 'Counts rooms.',
      '--yes',
    ])

    expect(options).toEqual({
      mode: 'builtin',
      name: 'Room Inventory',
      slug: 'room-inventory',
      surface: 'bim.tools',
      body: 'empty',
      author: 'Nico',
      description: 'Counts rooms.',
      yes: true,
    })
  })

  it('accepts --flag=value as well as --flag value', () => {
    expect(parseFlags(['--slug=room-inventory'])).toEqual({ slug: 'room-inventory' })
  })

  it('reads the kit spec override the build tests need', () => {
    expect(parseFlags(['--kit-spec', 'file:../plugin-kit'])).toEqual({
      kitSpec: 'file:../plugin-kit',
    })
  })

  it('returns nothing for an empty argv, so prompts decide every field', () => {
    expect(parseFlags([])).toEqual({})
  })

  it('rejects an unknown flag rather than ignoring a typo', () => {
    expect(() => parseFlags(['--surfce', 'map.tools'])).toThrow(/--surfce/)
  })

  it('rejects an invalid surface, naming the valid ones', () => {
    expect(() => parseFlags(['--surface', 'map.layers'])).toThrow(/map\.tools/)
  })

  it('rejects an invalid mode and an invalid body', () => {
    expect(() => parseFlags(['--mode', 'sideways'])).toThrow(/external/)
    expect(() => parseFlags(['--body', 'fancy'])).toThrow(/example/)
  })

  it('rejects a flag given without its value', () => {
    expect(() => parseFlags(['--slug'])).toThrow(/--slug/)
  })

  it('rejects a value-taking flag followed by another flag, not silently consuming it', () => {
    expect(() => parseFlags(['--slug', '--yes'])).toThrow(/--slug/)
  })

  it('accepts -y as shorthand for --yes', () => {
    expect(parseFlags(['-y'])).toEqual({ yes: true })
  })

  it('rejects a bare positional argument, since the target comes from the slug', () => {
    expect(() => parseFlags(['room-inventory'])).toThrow(/room-inventory/)
  })
})

describe('DEFAULT_KIT_SPEC', () => {
  it('is a published range rather than a local path, so a real author can install', () => {
    expect(DEFAULT_KIT_SPEC).toMatch(/^\^?\d+\.\d+\.\d+/)
  })
})
