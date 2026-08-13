// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { existsSync, statSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { DEFAULT_KIT_SPEC } from './options'
import { capabilityConstant, componentName, render, TEMPLATE_ROOT, tokensFor } from './render'

import type { Options } from './options'

const options: Options = {
  mode: 'external',
  name: 'Room Inventory',
  slug: 'room-inventory',
  surface: 'map.tools',
  body: 'example',
  author: 'Nico',
  description: 'Counts rooms.',
  yes: true,
  kitSpec: DEFAULT_KIT_SPEC,
}

describe('componentName', () => {
  it('makes a PascalCase component name, per the naming convention', () => {
    expect(componentName('Room Inventory')).toBe('RoomInventoryTool')
    expect(componentName('room-inventory')).toBe('RoomInventoryTool')
  })

  it('does not double the Tool suffix', () => {
    expect(componentName('Room Tool')).toBe('RoomTool')
  })

  it('drops characters that cannot appear in an identifier', () => {
    expect(componentName('Rooms & Spaces (v2)')).toBe('RoomsSpacesV2Tool')
  })

  it('keeps an already-camelCase word intact rather than splitting it', () => {
    expect(componentName('roomInventory')).toBe('RoomInventoryTool')
  })
})

describe('capabilityConstant', () => {
  it('names the surface entry the kit exports for each capability', () => {
    expect(capabilityConstant('map.tools')).toBe('map')
    expect(capabilityConstant('bim.tools')).toBe('bim')
    expect(capabilityConstant('pointcloud.tools')).toBe('pointcloud')
    expect(capabilityConstant('map.legends')).toBe('legend')
  })
})

describe('render', () => {
  it('substitutes every token', () => {
    expect(render('slug={{SLUG}} name={{NAME}}', { SLUG: 'a', NAME: 'b' })).toBe('slug=a name=b')
  })

  it('substitutes a token used more than once', () => {
    expect(render('{{SLUG}}/{{SLUG}}', { SLUG: 'a' })).toBe('a/a')
  })

  it('throws on a token the caller did not supply, rather than shipping the placeholder', () => {
    expect(() => render('{{MISSING}}', { SLUG: 'a' })).toThrow(/MISSING/)
  })

  it('leaves a JSX expression alone, since templates contain real code', () => {
    expect(render('{count}', {})).toBe('{count}')
    expect(render('{t(\'title\', \'x\')}', {})).toBe('{t(\'title\', \'x\')}')
  })

  it('passes a template with no tokens through unchanged', () => {
    const source = 'export function ReadoutRow() { return null }\n'

    expect(render(source, {})).toBe(source)
  })

  it('does not rescan substituted text, so a value containing braces is safe', () => {
    expect(render('{{NAME}}', { NAME: '{{SLUG}}' })).toBe('{{SLUG}}')
  })
})

describe('tokensFor', () => {
  it('derives every token a template needs', () => {
    const tokens = tokensFor(options)

    expect(tokens.SLUG).toBe('room-inventory')
    expect(tokens.NAME).toBe('Room Inventory')
    expect(tokens.DESCRIPTION).toBe('Counts rooms.')
    expect(tokens.AUTHOR).toBe('Nico')
    expect(tokens.CAPABILITY).toBe('map.tools')
    expect(tokens.SURFACE).toBe('map')
    expect(tokens.COMPONENT).toBe('RoomInventoryTool')
    expect(tokens.HOST_API).toBe('1')
    expect(tokens.KIT_SPEC).toBe(DEFAULT_KIT_SPEC)
  })

  it('escapes a name containing a quote, so the manifest stays valid JSON', () => {
    const tokens = tokensFor({ ...options, name: 'Nico\'s "Rooms"', description: 'A "test".' })

    expect(() => JSON.parse(
      `{"name":"${tokens.NAME_JSON}","d":"${tokens.DESCRIPTION_JSON}"}`,
    )).not.toThrow()
  })

  it('escapes a backslash, which would otherwise open an invalid escape', () => {
    const tokens = tokensFor({ ...options, author: 'DOMAIN\\nico' })

    const parsed = JSON.parse(`{"a":"${tokens.AUTHOR_JSON}"}`) as { a: string }

    expect(parsed.a).toBe('DOMAIN\\nico')
  })

  it('escapes a newline rather than breaking the JSON across lines', () => {
    const tokens = tokensFor({ ...options, description: 'One.\nTwo.' })

    const parsed = JSON.parse(`{"d":"${tokens.DESCRIPTION_JSON}"}`) as { d: string }

    expect(parsed.d).toBe('One.\nTwo.')
  })
})

describe('TEMPLATE_ROOT', () => {
  it('points at a directory that exists, since a missing one fails at scaffold time', () => {
    expect(existsSync(TEMPLATE_ROOT)).toBe(true)
    expect(statSync(TEMPLATE_ROOT).isDirectory()).toBe(true)
  })

  it('sits beside dist rather than inside it, since tsup does not copy templates', () => {
    expect(TEMPLATE_ROOT.replace(/\\/g, '/')).toMatch(/create-cdt-plugin\/templates$/)
  })
})
