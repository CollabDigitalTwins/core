// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { factsFor } from './surfaces'
import { viewersFor } from './viewers'

import type { Options, Surface } from './options'

// Beside `dist/`, not inside it: tsup bundles TypeScript and would not copy templates.
// Resolved from this module's URL, not the cwd, since the CLI runs where it is scaffolding.
export const TEMPLATE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../templates')

export type TOKENS = Record<string, string>

/** The kit's type entry for each capability, which is also the template variant name. */
const SURFACE_ENTRY: Record<Surface, string> = {
  'map.tools': 'map',
  'bim.tools': 'bim',
  'pointcloud.tools': 'pointcloud',
  'viewer.legends': 'legend',
  'map.layers': 'map',
  'data.pages': 'ui',
  'viewer.tabs': 'ui',
  'ui.dialogs': 'ui',
}

export function capabilityConstant(surface: Surface): string {
  return SURFACE_ENTRY[surface]
}

/** PascalCase plus a `Tool` suffix, per the repo's `.tsx`-renders-UI naming rule. */
export function componentName(name: string): string {
  const pascal = name
    // Split on anything an identifier cannot contain, so "Rooms & Spaces (v2)" becomes
    // three words rather than one unusable one.
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')

  return pascal.endsWith('Tool') ? pascal : `${pascal}Tool`
}

// A missing token throws rather than rendering the placeholder through: a plugin containing a
// literal `{{SLUG}}` fails much later and less clearly. The double brace keeps this away from
// the single-brace JSX the component templates are full of, and `replace` with a function does
// not rescan what it inserted.
export function render(source: string, tokens: TOKENS): string {
  return source.replace(/\{\{([A-Z_]+)\}\}/g, (_match, token: string) => {
    if (!(token in tokens)) {
      throw new Error(`Template uses {{${token}}}, which is not a known token.`)
    }

    return tokens[token]
  })
}

// A JSON string body, so a quote, backslash or newline cannot break the generated manifest.
// Slicing off the quotes JSON.stringify adds lets the template keep its own and stay readable.
const jsonSafe = (value: string) => JSON.stringify(value).slice(1, -1)

// Explicit even when it lists all three: omitting the field means every viewer, chosen by none.
function viewersToken(options: Options): string {
  return `[${viewersFor(options.surfaces).map(viewer => `'${viewer}'`).join(', ')}]`
}

/** The body-file name for one surface, suffixed only when a plugin spans several. */
export function componentNameFor(options: Options, surface: Surface): string {
  const root = componentName(options.name)

  if (options.surfaces.length === 1) return root

  return `${root.replace(/Tool$/, '')}${factsFor(surface).example.replace(/^Example/, '')}`
}

// Pass `surface`/`component` for one surface of a multi-surface plugin; omitted, the first wins.
export function tokensFor(options: Options, surface?: Surface, component?: string): TOKENS {
  const primary = surface ?? options.surfaces[0]
  const facts = factsFor(primary)

  return {
    SLUG: options.slug,
    NAME: options.name,
    NAME_JSON: jsonSafe(options.name),
    DESCRIPTION: options.description,
    DESCRIPTION_JSON: jsonSafe(options.description),
    AUTHOR: options.author,
    AUTHOR_JSON: jsonSafe(options.author),
    CAPABILITY: primary,
    // A readable list for prose; the JSON variant is the manifest's own array body.
    CAPABILITIES: options.surfaces.join('`, `'),
    CAPABILITIES_JSON: options.surfaces.map(surface => `"${surface}"`).join(', '),
    VIEWERS: viewersToken(options),
    SURFACE: capabilityConstant(primary),
    COMPONENT: component ?? componentName(options.name),
    // Matches PLUGIN_HOST_API in core. A drift test there keeps the two equal.
    HOST_API: '1',
    // Escaped because its only use is inside a JSON string in package.json, and a `file:`
    // specifier on Windows carries backslashes that are invalid JSON escapes. A published
    // range like ^0.1.0 needs no escaping, which is why this only surfaces when pointing a
    // plugin at a local build of the kit.
    KIT_SPEC: jsonSafe(options.kitSpec),
    // The type names and icon the entry and component templates need, so a template
    // states the surface once and the table in surfaces.ts owns what that implies.
    CONTEXT_TYPE: facts.contextType,
    SURFACE_ENTRY: facts.entry,
    PROPS_TYPE: facts.propsType,
    ICON: facts.icon,
  }
}

/** Absolute path to one template file. */
export function templatePath(...segments: string[]): string {
  return join(TEMPLATE_ROOT, ...segments)
}
