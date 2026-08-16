// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { checkSlug, checkTarget, COMPILED_IN_SLUGS, isCorePackage, resolveTarget } from './target'

const temp = () => mkdtempSync(join(tmpdir(), 'cdt-target-'))

describe('checkSlug', () => {
  it('accepts a lowercase hyphenated slug', () => {
    expect(checkSlug('room-inventory')).toBeNull()
    expect(checkSlug('rooms2')).toBeNull()
  })

  it('refuses uppercase, underscores, spaces and a leading digit', () => {
    for (const bad of ['Room-Inventory', 'room_inventory', 'room inventory', '2rooms']) {
      expect(checkSlug(bad)).toMatch(/lowercase/)
    }
  })

  it('refuses an empty slug rather than resolving a target of the current directory', () => {
    expect(checkSlug('')).toMatch(/lowercase/)
  })

  it('refuses a slug that would escape the target directory', () => {
    for (const bad of ['../elsewhere', 'nested/plugin', '.']) {
      expect(checkSlug(bad)).toMatch(/lowercase/)
    }
  })

  it('refuses a slug that collides with a compiled-in plugin', () => {
    expect(checkSlug('hello-map')).toMatch(/compiled into/)
    expect(checkSlug('hello-bim')).toMatch(/compiled into/)
  })

  it('lists the plugins compiled into core', () => {
    expect([...COMPILED_IN_SLUGS]).toEqual(['hello-map', 'hello-bim', 'hello-everywhere'])
  })
})

describe('resolveTarget', () => {
  it('writes into ./plugins/<slug> when a plugins folder is already there', () => {
    const root = temp()
    mkdirSync(join(root, 'plugins'))

    expect(resolveTarget('external', 'room-inventory', root)).toBe(
      join(root, 'plugins', 'room-inventory'),
    )
  })

  it('writes into ./<slug> when there is no plugins folder', () => {
    const root = temp()

    expect(resolveTarget('external', 'room-inventory', root)).toBe(join(root, 'room-inventory'))
  })

  it('ignores a plugins file that is not a directory', () => {
    const root = temp()
    writeFileSync(join(root, 'plugins'), 'not a directory')

    expect(resolveTarget('external', 'room-inventory', root)).toBe(join(root, 'room-inventory'))
  })

  it('writes built-in plugins beside the others in core', () => {
    const root = temp()

    expect(resolveTarget('builtin', 'room-inventory', root)).toBe(
      join(root, 'src/core/plugins', 'room-inventory'),
    )
  })

  it('ignores a plugins folder in built-in mode, which has a fixed location', () => {
    const root = temp()
    mkdirSync(join(root, 'plugins'))

    expect(resolveTarget('builtin', 'room-inventory', root)).toBe(
      join(root, 'src/core/plugins', 'room-inventory'),
    )
  })
})

describe('checkTarget', () => {
  it('accepts a path that does not exist', () => {
    expect(checkTarget(join(temp(), 'room-inventory'))).toBeNull()
  })

  it('accepts an existing empty directory', () => {
    const directory = join(temp(), 'room-inventory')
    mkdirSync(directory)

    expect(checkTarget(directory)).toBeNull()
  })

  it('refuses a non-empty directory rather than merging into it', () => {
    const directory = join(temp(), 'room-inventory')
    mkdirSync(directory)
    writeFileSync(join(directory, 'manifest.json'), '{}')

    expect(checkTarget(directory)).toMatch(/not empty/)
  })

  it('refuses a path that exists as a file', () => {
    const path = join(temp(), 'room-inventory')
    writeFileSync(path, 'in the way')

    expect(checkTarget(path)).toMatch(/not a directory/)
  })
})

describe('isCorePackage', () => {
  it('is true for a directory whose package.json is @collabdt/core', () => {
    const root = temp()
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: '@collabdt/core' }))

    expect(isCorePackage(root)).toBe(true)
  })

  it('is false for another package, and for no package.json at all', () => {
    const other = temp()
    writeFileSync(join(other, 'package.json'), JSON.stringify({ name: 'cdt-na' }))

    expect(isCorePackage(other)).toBe(false)
    expect(isCorePackage(temp())).toBe(false)
  })

  it('is false rather than throwing on an unparseable package.json', () => {
    const root = temp()
    writeFileSync(join(root, 'package.json'), '{ not json')

    expect(isCorePackage(root)).toBe(false)
  })
})
