// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { addToInstalled, addToManifests } from './registration'

// Trimmed to the shape the edits anchor on, matching core's real files.
const MANIFESTS = `import helloBimManifest from './hello-bim/manifest.json'
import helloMapManifest from './hello-map/manifest.json'

import type { PluginManifest } from './sdk/types'

export const PLUGIN_MANIFESTS: PluginManifest[] = [
  helloMapManifest as PluginManifest,
  helloBimManifest as PluginManifest,
]
`

const INSTALLED = `export const INSTALLED_PLUGINS: PluginSource[] = [
  { manifest: manifestFor('hello-map'), entry: () => import('./hello-map') },
  { manifest: manifestFor('hello-bim'), entry: () => import('./hello-bim') },
]
`

describe('addToManifests', () => {
  it('adds the import and the array entry', () => {
    const result = addToManifests(MANIFESTS, 'room-inventory') ?? ''

    expect(result).toContain("import roomInventoryManifest from './room-inventory/manifest.json'")
    expect(result).toContain('roomInventoryManifest as PluginManifest,')
  })

  it('keeps the existing entries', () => {
    const result = addToManifests(MANIFESTS, 'room-inventory') ?? ''

    expect(result).toContain('helloMapManifest as PluginManifest,')
    expect(result).toContain('helloBimManifest as PluginManifest,')
  })

  it('places the new import in alphabetical order, which core lints for', () => {
    const result = addToManifests(MANIFESTS, 'room-inventory') ?? ''
    const imports = [...result.matchAll(/^import (\w+Manifest) from/gm)].map(m => m[1])

    expect(imports).toEqual(['helloBimManifest', 'helloMapManifest', 'roomInventoryManifest'])
  })

  it('orders a slug that sorts first correctly too', () => {
    const result = addToManifests(MANIFESTS, 'aaa-plugin') ?? ''
    const imports = [...result.matchAll(/^import (\w+Manifest) from/gm)].map(m => m[1])

    expect(imports).toEqual(['aaaPluginManifest', 'helloBimManifest', 'helloMapManifest'])
  })

  it('camelCases a multi-hyphen slug into one identifier', () => {
    const result = addToManifests(MANIFESTS, 'room-inventory-pro') ?? ''

    expect(result).toContain('import roomInventoryProManifest from')
  })

  it('is idempotent, so re-running does not double-register', () => {
    const once = addToManifests(MANIFESTS, 'room-inventory') ?? ''
    const twice = addToManifests(once, 'room-inventory') ?? ''

    expect(twice).toBe(once)
  })

  it('returns null when the array is not where it expects, rather than corrupting the file', () => {
    expect(addToManifests('export const SOMETHING_ELSE = []', 'room-inventory')).toBeNull()
  })

  it('returns null when there is no manifest import to sort against', () => {
    const noImports = 'export const PLUGIN_MANIFESTS: PluginManifest[] = [\n]\n'

    expect(addToManifests(noImports, 'room-inventory')).toBeNull()
  })
})

describe('addToInstalled', () => {
  it('adds an entry with a dynamic import, not a static one', () => {
    const result = addToInstalled(INSTALLED, 'room-inventory') ?? ''

    expect(result).toContain(
      "{ manifest: manifestFor('room-inventory'), entry: () => import('./room-inventory') },",
    )
  })

  it('keeps the existing entries', () => {
    const result = addToInstalled(INSTALLED, 'room-inventory') ?? ''

    expect(result).toContain("manifestFor('hello-map')")
    expect(result).toContain("manifestFor('hello-bim')")
  })

  it('is idempotent', () => {
    const once = addToInstalled(INSTALLED, 'room-inventory') ?? ''

    expect(addToInstalled(once, 'room-inventory')).toBe(once)
  })

  it('returns null on an unrecognised shape', () => {
    expect(addToInstalled('const x = 1', 'room-inventory')).toBeNull()
  })
})

describe('CRLF files, which is what core actually has on Windows', () => {
  const crlf = (source: string) => source.replace(/\n/g, '\r\n')

  it('adds both the import and the entry, not just the entry', () => {
    // The regression this exists for: rebuilding the import block joined with \n matched
    // nothing in a CRLF file, so the array gained an entry whose identifier was never
    // imported and the file threw ReferenceError at load.
    const result = addToManifests(crlf(MANIFESTS), 'room-inventory') ?? ''

    expect(result).toContain("import roomInventoryManifest from './room-inventory/manifest.json'")
    expect(result).toContain('roomInventoryManifest as PluginManifest,')
  })

  it('keeps the file on CRLF rather than mixing endings', () => {
    const result = addToManifests(crlf(MANIFESTS), 'room-inventory') ?? ''

    expect(result).not.toMatch(/[^\r]\n/)
  })

  it('keeps the new import in alphabetical order', () => {
    const result = addToManifests(crlf(MANIFESTS), 'room-inventory') ?? ''
    const imports = [...result.matchAll(/^import (\w+Manifest) from/gm)].map(m => m[1])

    expect(imports).toEqual(['helloBimManifest', 'helloMapManifest', 'roomInventoryManifest'])
  })

  it('adds the installed entry on CRLF too', () => {
    const result = addToInstalled(crlf(INSTALLED), 'room-inventory') ?? ''

    expect(result).toContain("manifestFor('room-inventory')")
    expect(result).not.toMatch(/[^\r]\n/)
  })

  it('stays idempotent on CRLF', () => {
    const once = addToManifests(crlf(MANIFESTS), 'room-inventory') ?? ''

    expect(addToManifests(once, 'room-inventory')).toBe(once)
  })
})

describe('both edits together', () => {
  it('produce a file that still parses as the array it was', () => {
    const manifests = addToManifests(MANIFESTS, 'room-inventory') ?? ''
    const installed = addToInstalled(INSTALLED, 'room-inventory') ?? ''

    // Three entries in each, and the brackets still balance.
    expect([...manifests.matchAll(/as PluginManifest,/g)]).toHaveLength(3)
    expect([...installed.matchAll(/manifestFor\(/g)]).toHaveLength(3)
    expect(manifests.split('[').length).toBe(manifests.split(']').length)
  })
})
