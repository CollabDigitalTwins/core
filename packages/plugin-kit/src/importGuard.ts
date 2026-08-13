// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { readFile } from 'node:fs/promises'

import { KNOWN_FORBIDDEN, PLUGIN_EXTERNALS } from './externals'

/** The slice of esbuild's metafile this needs. */
export interface Metafile {
  outputs: Record<string, { imports?: { path: string; kind: string; external?: boolean }[] }>
  /** Every module esbuild read, keyed by resolved path — the keys are what reveal an inlined package. */
  inputs?: Record<string, unknown>
}

// Global because only the *last* `node_modules` segment names the owning package. The first
// yields `.pnpm` under pnpm's store and the wrapper under a nested install, either of which
// makes an inlined three.js read as a package nobody forbids.
const NODE_MODULES_PACKAGE = /node_modules\/((?:@[^/]+\/)?[^/]+)\//g

/** The package an input path belongs to, or undefined if it is outside any `node_modules`. */
function packageOf(input: string): string | undefined {
  let name: string | undefined

  for (const match of input.matchAll(NODE_MODULES_PACKAGE)) {
    name = match[1]
  }

  return name
}

// esbuild keys `inputs` relative to the build directory, so own files look like
// `src/index.tsx`. Virtual paths from an esbuild plugin (`sass:src/a.scss`) count as own
// source: no rule can attribute them, and failing every such build costs more than it guards.
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

// Reading `inputs` is the only way to catch a library never marked external: importing
// `three` without `external: ['three']` leaves `checkImports` nothing to see and inlines it.
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

// An empty package list otherwise means both "inlined nothing" and "a layout the scan cannot
// read", and only the first is clean.
export type BundleScanVerdict =
  | { verifiable: true }
  | { verifiable: false; reason: string }

/** How many offending paths to name before the message stops being useful. */
const MAX_LISTED_INPUTS = 5

// Every input must be attributable to a package or to the plugin's own source. One that is
// neither would let a forbidden library be reported as a clean bundle, so refuse to answer.
// Inputs with no `node_modules` at all are the normal shape for a correct plugin, not a smell.
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

// React included: a bundled copy breaks hooks, which is as fatal as a bundled three.js.
const BUNDLED_FORBIDDEN: readonly string[] = [...KNOWN_FORBIDDEN, 'react', 'react-dom']

/** Only `BUNDLED_FORBIDDEN` entries; an ordinary bundled utility such as `date-fns` is legitimate. */
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

  // An unreadable bundle is a failure, not a pass: reporting nothing would hand the
  // author a guarantee this package cannot keep.
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
