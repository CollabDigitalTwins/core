// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { readFile } from 'node:fs/promises'

import { KNOWN_FORBIDDEN, PLUGIN_EXTERNALS } from './externals'

/** The slice of esbuild's metafile this needs. */
export interface Metafile {
  outputs: Record<string, { imports?: { path: string; kind: string; external?: boolean }[] }>
  /**
   * Every module esbuild read while bundling, keyed by resolved path. Values are unused
   * here; only the keys (real filesystem-derived paths, e.g.
   * `node_modules/three/build/three.module.js`) matter for spotting inlined packages.
   */
  inputs?: Record<string, unknown>
}

/**
 * Matches a package name out of a `node_modules`-relative path, scoped or not.
 * esbuild always writes forward slashes in the metafile regardless of host OS,
 * so no backslash handling is needed here.
 */
const NODE_MODULES_PACKAGE = /node_modules\/((?:@[^/]+\/)?[^/]+)\//

export function collectExternalImports(metafile: Metafile, outFile: string): string[] {
  const output = metafile.outputs[outFile]

  if (!output) {
    throw new Error(
      `Plugin build check could not find "${outFile}" in the esbuild metafile. ` +
      `Outputs present: ${Object.keys(metafile.outputs).join(', ') || 'none'}.`,
    )
  }

  return (output.imports ?? [])
    .filter(entry => entry.external)
    .map(entry => entry.path)
}

/** Returns the specifiers that are not allowed. Empty means the bundle is clean. */
export function checkImports(imports: string[]): string[] {
  return imports.filter(specifier => !PLUGIN_EXTERNALS.includes(specifier))
}

/**
 * Distinct package names inlined into the bundle, read from the metafile's `inputs`
 * (every module esbuild actually read). This is the only way to catch a forbidden
 * library that was never marked `external` in the first place: `checkImports` only
 * ever sees specifiers esbuild left external, so `import * as THREE from 'three'`
 * with no `external: ['three']` config produces zero external imports and an
 * inlined copy of three.js — a clean-looking `checkImports` result hiding the exact
 * second-copy crash this package exists to prevent.
 */
export function collectBundledPackages(metafile: Metafile): string[] {
  const packages = new Set<string>()

  for (const path of Object.keys(metafile.inputs ?? {})) {
    const match = NODE_MODULES_PACKAGE.exec(path)
    if (match) {
      packages.add(match[1])
    }
  }

  return [...packages]
}

/**
 * Libraries that must never be bundled, whether imported as a bare external specifier
 * (caught by `checkImports`) or inlined (caught by `checkBundled`). Includes `react`
 * and `react-dom` alongside `KNOWN_FORBIDDEN`: a bundled copy of React is the original
 * documented crash (breaks hooks) and is exactly as fatal as a bundled three.js.
 */
const BUNDLED_FORBIDDEN: readonly string[] = [...KNOWN_FORBIDDEN, 'react', 'react-dom']

/**
 * Returns the bundled packages that must never be inlined. An ordinary small utility
 * library (e.g. `date-fns`) bundled by a plugin is legitimate and is not flagged --
 * only `BUNDLED_FORBIDDEN` entries are.
 */
export function checkBundled(packages: string[]): string[] {
  return packages.filter(name => BUNDLED_FORBIDDEN.includes(name))
}

function explainExternal(specifier: string): string {
  if (KNOWN_FORBIDDEN.includes(specifier)) {
    return `  ${specifier} — a plugin must never bundle this. A second copy breaks the app at runtime. ` +
      `Viewer instances arrive as props and icons are named by string, so you do not need to import it.`
  }

  return `  ${specifier} — the CDT host does not publish a shim for this, so the browser cannot resolve it. ` +
    `A plugin may only import: ${PLUGIN_EXTERNALS.join(', ')}.`
}

function explainBundled(name: string): string {
  return `  ${name} — inlined into the bundle instead of imported as an external. A second copy ` +
    `breaks the app at runtime just as if it had been imported directly. Do not bundle it; ` +
    `rely on the host's copy instead.`
}

export async function assertBundleImports(
  metafilePath: string,
  outFile: string,
): Promise<void> {
  const metafile = JSON.parse(await readFile(metafilePath, 'utf8')) as Metafile
  const offendingImports = checkImports(collectExternalImports(metafile, outFile))
  const offendingBundled = checkBundled(collectBundledPackages(metafile))

  if (offendingImports.length === 0 && offendingBundled.length === 0) {
    return
  }

  const sections: string[] = []

  if (offendingImports.length > 0) {
    sections.push(
      `Imports outside the allowlist (${offendingImports.length}):\n` +
      offendingImports.map(explainExternal).join('\n'),
    )
  }

  if (offendingBundled.length > 0) {
    sections.push(
      `Forbidden libraries bundled instead of left external (${offendingBundled.length}):\n` +
      offendingBundled.map(explainBundled).join('\n'),
    )
  }

  throw new Error(
    `This plugin bundle has ${offendingImports.length + offendingBundled.length} problem(s):\n\n` +
    sections.join('\n\n'),
  )
}
