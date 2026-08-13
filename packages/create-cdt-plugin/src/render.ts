// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { factsFor } from './surfaces'

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
  'map.legends': 'legend',
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

export function tokensFor(options: Options): TOKENS {
  const facts = factsFor(options.surface)

  return {
    SLUG: options.slug,
    NAME: options.name,
    NAME_JSON: jsonSafe(options.name),
    DESCRIPTION: options.description,
    DESCRIPTION_JSON: jsonSafe(options.description),
    AUTHOR: options.author,
    AUTHOR_JSON: jsonSafe(options.author),
    CAPABILITY: options.surface,
    SURFACE: capabilityConstant(options.surface),
    COMPONENT: componentName(options.name),
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
    // The built-in templates' equivalent of SURFACE_ENTRY. Both are always supplied; each
    // template tree uses the one that resolves where its output lives.
    CORE_ENTRY: facts.coreEntry,
    PROPS_TYPE: facts.propsType,
    ICON: facts.icon,
  }
}

/** Absolute path to one template file. */
export function templatePath(...segments: string[]): string {
  return join(TEMPLATE_ROOT, ...segments)
}
