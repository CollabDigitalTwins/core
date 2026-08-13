// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Options, Surface } from './options'

/**
 * Templates sit beside `dist/`, not inside it: tsup bundles TypeScript and would not copy
 * them. `package.json`'s `files` ships the directory as-is.
 *
 * Resolved from this module's own URL rather than from `process.cwd()`, because the CLI
 * runs in the directory the author is scaffolding into.
 */
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

/**
 * Substitutes `{{TOKEN}}` and nothing else.
 *
 * A missing token throws rather than rendering the placeholder through: a scaffolded plugin
 * containing a literal `{{SLUG}}` fails much later and much less clearly. The double brace
 * is what keeps this from touching the single-brace JSX expressions the component templates
 * are full of.
 *
 * `replace` with a function does not rescan what it inserted, so a value that happens to
 * contain braces is substituted once and left alone.
 */
export function render(source: string, tokens: TOKENS): string {
  return source.replace(/\{\{([A-Z_]+)\}\}/g, (_match, token: string) => {
    if (!(token in tokens)) {
      throw new Error(`Template uses {{${token}}}, which is not a known token.`)
    }

    return tokens[token]
  })
}

/**
 * The body of a JSON string, so a quote, backslash or newline in a name cannot break the
 * generated manifest. Slicing off the quotes `JSON.stringify` adds lets the template keep
 * its own, which is what makes the file readable as JSON.
 */
const jsonSafe = (value: string) => JSON.stringify(value).slice(1, -1)

export function tokensFor(options: Options): TOKENS {
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
    KIT_SPEC: options.kitSpec,
  }
}

/** Absolute path to one template file. */
export function templatePath(...segments: string[]): string {
  return join(TEMPLATE_ROOT, ...segments)
}
