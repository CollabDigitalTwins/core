// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// A checked copy rather than an import: this package is a bin run by plain Node, which cannot
// resolve core's extensionless dist imports, and depending on core would pull three.js into a
// scaffolder. Core's createCdtPluginDrift.test.ts prevents the drift.
export const COMPILED_IN_SLUGS: readonly string[] = ['hello-map', 'hello-bim']

// No separators or dot segments: the slug becomes the directory name, so anything else lets a
// scaffold escape the path the target checks confirmed.
export const SLUG_PATTERN = /^[a-z][a-z0-9-]*$/

// A mounted folder can never shadow a compiled-in slug, so a plugin named after one would be
// scaffolded, built, mounted and then ignored forever with nothing pointing at the cause.
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

// Prefers an existing `plugins/` directory, so running this in a deployment root puts the
// folder where `PLUGINS_DIR` already points.
export function resolveTarget(slug: string, cwd: string): string {
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

