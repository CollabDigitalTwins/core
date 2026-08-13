// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import type { Mode } from './options'

/**
 * The slugs of the plugins compiled into core.
 *
 * A checked copy rather than an import. This package is a `bin` run by plain Node, and
 * core's `dist/` emits extensionless relative imports that only a bundler resolves, so
 * `import { PLUGIN_MANIFESTS } from '@collabdt/core/plugins-sdk'` dies on the barrel's
 * first re-export. Depending on core at all would also pull three.js into a scaffolder.
 * Drift is prevented by a test in core rather than by this file:
 * `src/core/plugins/host/createCdtPluginDrift.test.ts`.
 */
export const COMPILED_IN_SLUGS: readonly string[] = ['hello-map', 'hello-bim']

/**
 * Also the reason a slug cannot contain a path separator or a dot segment: the slug
 * becomes the target directory name, so anything else lets a scaffold escape the
 * directory the resolved path was confirmed against.
 */
export const SLUG_PATTERN = /^[a-z][a-z0-9-]*$/

/**
 * Returns why this slug cannot be used, or null if it can.
 *
 * The collision check is not cosmetic: a mounted folder can never shadow a compiled-in
 * slug, so a plugin named after one would be scaffolded, built, mounted and then ignored
 * forever with nothing pointing at the cause.
 */
export function checkSlug(slug: string): string | null {
  if (!SLUG_PATTERN.test(slug)) {
    return `"${slug}" is not a usable slug. Use lowercase letters, digits and hyphens, `
      + 'starting with a letter, for example "room-inventory".'
  }

  if (COMPILED_IN_SLUGS.includes(slug)) {
    return `"${slug}" is the slug of a plugin compiled into the CDT platform. A mounted `
      + 'plugin cannot replace one that is built in: it would be discovered, loaded and '
      + 'then ignored. Pick a different slug.'
  }

  return null
}

/**
 * Where the plugin folder goes.
 *
 * External mode prefers an existing `plugins/` directory, so running this in a deployment
 * root puts the folder where `PLUGINS_DIR` already points. Built-in mode has one correct
 * location and ignores the cwd's layout entirely.
 */
export function resolveTarget(mode: Mode, slug: string, cwd: string): string {
  if (mode === 'builtin') return join(cwd, 'src/core/plugins', slug)

  const plugins = join(cwd, 'plugins')
  const hasPluginsDirectory = existsSync(plugins) && statSync(plugins).isDirectory()

  return hasPluginsDirectory ? join(plugins, slug) : join(cwd, slug)
}

/** Refuses a non-empty target rather than merging into someone else's work. */
export function checkTarget(directory: string): string | null {
  if (!existsSync(directory)) return null
  if (!statSync(directory).isDirectory()) return `${directory} exists and is not a directory.`
  if (readdirSync(directory).length > 0) return `${directory} exists and is not empty.`

  return null
}

/** Built-in mode's template is worthless outside core, so the CLI refuses to run there. */
export function isCorePackage(cwd: string): boolean {
  try {
    const manifest = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')) as { name?: string }

    return manifest.name === '@collabdt/core'
  } catch {
    // No package.json, or an unparseable one. Either way this is not core, and guessing
    // would put a plugin somewhere the caller did not expect.
    return false
  }
}
