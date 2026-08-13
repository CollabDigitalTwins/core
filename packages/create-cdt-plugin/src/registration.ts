// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Options } from './options'

/** `room-inventory` -> `roomInventoryManifest`, matching the existing identifiers. */
function manifestIdentifier(slug: string): string {
  const camel = slug.replace(/-([a-z0-9])/g, (_match, character: string) => character.toUpperCase())

  return `${camel}Manifest`
}

const MANIFESTS_ANCHOR = 'export const PLUGIN_MANIFESTS: PluginManifest[] = ['
const INSTALLED_ANCHOR = 'export const INSTALLED_PLUGINS: PluginSource[] = ['

// Everything here works line by line rather than on reconstructed blocks. Rebuilding the
// import block joined with a bare newline matched nothing in core's CRLF files, so the array
// entry landed without its import and the file referenced an undefined identifier.
const eolOf = (source: string) => (source.includes('\r\n') ? '\r\n' : '\n')

const MANIFEST_IMPORT = /^import \w+Manifest from '\.\/[^']+'$/

// Returns null when either anchor is missing rather than attempting the edit: an unregistered
// built-in plugin loads nothing and reports nothing, so a half-applied edit is worse than
// printing the snippets for a person to paste.
export function addToManifests(source: string, slug: string): string | null {
  const identifier = manifestIdentifier(slug)
  const entry = `  ${identifier} as PluginManifest,`

  if (source.includes(entry)) return source
  if (!source.includes(MANIFESTS_ANCHOR)) return null

  const eol = eolOf(source)
  const lines = source.split(/\r?\n/)
  const importLine = `import ${identifier} from './${slug}/manifest.json'`

  const existing = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => MANIFEST_IMPORT.test(line))

  if (existing.length === 0) return null

  // Core's ESLint sorts imports, so the new one goes into alphabetical position among the
  // existing manifest imports rather than being appended.
  const before = existing.find(({ line }) => importLine.localeCompare(line) < 0)
  const at = before ? before.index : existing[existing.length - 1].index + 1

  lines.splice(at, 0, importLine)

  return lines.join(eol).replace(MANIFESTS_ANCHOR, `${MANIFESTS_ANCHOR}${eol}${entry}`)
}

// A dynamic import, never static: installed.ts is reachable from every route's provider tree,
// so a static one would pull this plugin's components into the eager bundle.
export function addToInstalled(source: string, slug: string): string | null {
  const entry = `  { manifest: manifestFor('${slug}'), entry: () => import('./${slug}') },`

  if (source.includes(entry)) return source
  if (!source.includes(INSTALLED_ANCHOR)) return null

  return source.replace(INSTALLED_ANCHOR, `${INSTALLED_ANCHOR}${eolOf(source)}${entry}`)
}

// Never throws on an unrecognised file: `snippets` is how the caller tells the person what to
// add, which is the whole point of not guessing at the edit.
export async function registerBuiltin(
  coreRoot: string,
  options: Options,
): Promise<{ edited: string[]; snippets: string[] }> {
  const identifier = manifestIdentifier(options.slug)

  const targets = [
    {
      file: 'src/core/plugins/manifests.ts',
      apply: addToManifests,
      snippet: `import ${identifier} from './${options.slug}/manifest.json'\n`
        + '// then, inside PLUGIN_MANIFESTS:\n'
        + `  ${identifier} as PluginManifest,`,
    },
    {
      file: 'src/core/plugins/installed.ts',
      apply: addToInstalled,
      snippet: '// inside INSTALLED_PLUGINS:\n'
        + `  { manifest: manifestFor('${options.slug}'), `
        + `entry: () => import('./${options.slug}') },`,
    },
  ]

  const edited: string[] = []
  const snippets: string[] = []

  for (const { file, apply, snippet } of targets) {
    const path = join(coreRoot, file)

    let source: string

    try {
      source = await readFile(path, 'utf8')
    } catch {
      snippets.push(`${file} (not found):\n${snippet}`)
      continue
    }

    const updated = apply(source, options.slug)

    if (updated === null) {
      snippets.push(`${file}:\n${snippet}`)
      continue
    }

    if (updated !== source) await writeFile(path, updated, 'utf8')

    edited.push(file)
  }

  return { edited, snippets }
}
