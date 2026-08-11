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
 *
 * Global on purpose: a path may contain several `node_modules` segments and only
 * the **last** names the package the file belongs to. Under pnpm's store layout
 * `node_modules/.pnpm/three@0.180.0/node_modules/three/build/three.module.js` the
 * first match is `.pnpm`, and for a transitive install
 * `node_modules/foo/node_modules/three/index.js` it is `foo` — in both cases an
 * inlined three.js reads as a package nobody forbids, which is exactly the crash
 * this file exists to prevent.
 */
const NODE_MODULES_PACKAGE = /node_modules\/((?:@[^/]+\/)?[^/]+)\//g

/**
 * The package an input path belongs to, or undefined if it is not inside any
 * `node_modules`. Always the last segment; see `NODE_MODULES_PACKAGE`.
 */
function packageOf(input: string): string | undefined {
  let name: string | undefined

  for (const match of input.matchAll(NODE_MODULES_PACKAGE)) {
    name = match[1]
  }

  return name
}

/**
 * Whether an input path is the plugin's own source rather than a dependency.
 *
 * esbuild keys `inputs` relative to the build's working directory and
 * forward-slashed, so a plugin's own files look like `src/index.tsx`. Anything
 * that escapes that directory (`../…`) or is absolute (`/…`, `C:/…`) came from
 * somewhere else, and if it also carries no `node_modules` segment there is no way
 * to say which package it belongs to.
 *
 * A namespaced virtual path from an esbuild plugin (`sass:src/a.scss`) matches
 * neither escape, so it counts as the plugin's own source. That is the forgiving
 * side of the trade deliberately: such a path cannot be attributed to a package by
 * any rule, and failing every build that uses an esbuild plugin would cost more
 * than the case it guards.
 */
function isPluginOwnSource(input: string): boolean {
  return !input.startsWith('../') && !input.startsWith('/') && !/^[a-zA-Z]:\//.test(input)
}

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
    const name = packageOf(path)
    if (name) {
      packages.add(name)
    }
  }

  return [...packages]
}

/**
 * Whether `collectBundledPackages` could see enough to answer at all, and if not,
 * why. An empty package list means two very different things — "this bundle inlined
 * nothing" and "this layout is one the scan cannot read" — and only the first is
 * clean.
 */
export type BundleScanVerdict =
  | { verifiable: true }
  | { verifiable: false; reason: string }

/** How many offending paths to name before the message stops being useful. */
const MAX_LISTED_INPUTS = 5

/**
 * Decides whether the inlined-library scan can be trusted for this metafile.
 *
 * Every input has to be attributable to something: a package (it sits under a
 * `node_modules` segment) or the plugin's own source (a path relative to the build
 * directory). An input that is neither — an absolute path or one escaping the
 * plugin root, with no `node_modules` anywhere in it — is a module the scan read
 * but cannot name, and a forbidden library arriving that way would be reported as
 * a clean bundle. Say so instead.
 *
 * Note what this deliberately does *not* treat as suspicious: a metafile whose
 * inputs contain no `node_modules` at all. That is the normal, correct shape for a
 * plugin that leaves every host library external — the clean fixture's inputs are
 * exactly `["src/index.tsx"]` — so failing on it would fail every well-written
 * plugin.
 */
export function canVerifyBundled(metafile: Metafile): BundleScanVerdict {
  const inputs = Object.keys(metafile.inputs ?? {})

  if (inputs.length === 0) {
    return {
      verifiable: false,
      reason:
        'the esbuild metafile records no inputs, so there is no way to tell what the bundle ' +
        'inlined. esbuild always lists at least the entry point, so an empty list means the ' +
        'metafile is not the one this build produced — check that `metafile: true` is still set ' +
        'and that nothing overwrote dist/.',
    }
  }

  const unattributable = inputs.filter(
    input => packageOf(input) === undefined && !isPluginOwnSource(input),
  )

  if (unattributable.length > 0) {
    const listed = unattributable.slice(0, MAX_LISTED_INPUTS)
    const rest = unattributable.length - listed.length

    return {
      verifiable: false,
      reason:
        `${unattributable.length} module(s) in this bundle sit outside the plugin directory and ` +
        'outside any node_modules, so there is no package name to check them against:\n' +
        listed.map(input => `    ${input}`).join('\n') +
        (rest > 0 ? `\n    …and ${rest} more` : '') +
        '\n  Build the plugin from an install layout that puts dependencies under node_modules ' +
        '(npm, yarn classic, or pnpm) so the check can name what it is looking at. Passing this ' +
        'unchecked is not an option: an inlined React or three.js arriving this way would read ' +
        'as a clean bundle.',
    }
  }

  return { verifiable: true }
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
  const verdict = canVerifyBundled(metafile)
  const offendingBundled = verdict.verifiable
    ? checkBundled(collectBundledPackages(metafile))
    : []

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

  // An unreadable bundle is a failure, not a pass. This package promises that a
  // plugin inlining a forbidden library cannot build; a scan that cannot see what
  // was inlined cannot keep that promise, and reporting nothing would hand the
  // author a guarantee they do not have.
  if (!verdict.verifiable) {
    sections.push(`Cannot check what this bundle inlined:\n  ${verdict.reason}`)
  }

  if (sections.length === 0) {
    return
  }

  const problems =
    offendingImports.length + offendingBundled.length + (verdict.verifiable ? 0 : 1)

  throw new Error(
    `This plugin bundle has ${problems} problem(s):\n\n` + sections.join('\n\n'),
  )
}
