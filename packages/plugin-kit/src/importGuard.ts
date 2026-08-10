// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { readFile } from 'node:fs/promises'

import { KNOWN_FORBIDDEN, PLUGIN_EXTERNALS } from './externals'

/** The slice of esbuild's metafile this needs. */
export interface Metafile {
  outputs: Record<string, { imports?: { path: string; kind: string; external?: boolean }[] }>
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

function explain(specifier: string): string {
  if (KNOWN_FORBIDDEN.includes(specifier)) {
    return `  ${specifier} — a plugin must never bundle this. A second copy breaks the app at runtime. ` +
      `Viewer instances arrive as props and icons are named by string, so you do not need to import it.`
  }

  return `  ${specifier} — the CDT host does not publish a shim for this, so the browser cannot resolve it. ` +
    `A plugin may only import: ${PLUGIN_EXTERNALS.join(', ')}.`
}

export async function assertBundleImports(
  metafilePath: string,
  outFile: string,
): Promise<void> {
  const metafile = JSON.parse(await readFile(metafilePath, 'utf8')) as Metafile
  const offenders = checkImports(collectExternalImports(metafile, outFile))

  if (offenders.length > 0) {
    throw new Error(
      `This plugin bundle imports ${offenders.length} specifier(s) it may not:\n` +
      offenders.map(explain).join('\n'),
    )
  }
}
