// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { registerBuiltin } from './registration'
import { render, templatePath, tokensFor } from './render'
import { factsFor } from './surfaces'
import { checkSlug, checkTarget, isCorePackage, resolveTarget } from './target'

import type { Options } from './options'

/** Template file -> path inside the generated plugin. */
function planFor(options: Options): Array<[string, string]> {
  const entry = `${factsFor(options.surface).indexTemplate}.ts`

  if (options.mode === 'builtin') {
    return [
      ['builtin/manifest.json', 'manifest.json'],
      [`builtin/${entry}`, 'index.ts'],
      ...bodyFiles(options),
    ]
  }

  return [
    ['external/manifest.json', 'manifest.json'],
    ['external/package.json', 'package.json'],
    ['external/tsconfig.json', 'tsconfig.json'],
    ['external/tsup.config.ts', 'tsup.config.ts'],
    ['external/gitignore', '.gitignore'],
    ['external/README.md', 'README.md'],
    [`external/src/${entry}`, 'src/index.ts'],
    ...bodyFiles(options),
  ]
}

// More than one file for the example, which composes a child component from its own file. The
// bundle is still single-file: the delivery constraint says nothing about how source is
// organised, and a one-file example reads as saying a plugin is one component.
//
// Empty.tsx interpolates a toolbar props type, so a surface without one (`allowsEmpty: false`)
// takes its example whatever the caller asked for: routing it to Empty would emit invalid
// TypeScript, and its example is the smallest thing that surface can be.
function bodyFiles(options: Options): Array<[string, string]> {
  const facts = factsFor(options.surface)
  const templates = options.mode === 'builtin' ? 'builtin/components' : 'external/src/components'
  const destination = options.mode === 'builtin' ? 'components' : 'src/components'
  const root = `${destination}/${tokensFor(options).COMPONENT}.tsx`

  if (options.body === 'empty' && facts.allowsEmpty) {
    return [[`${templates}/Empty.tsx`, root]]
  }

  const example: Array<[string, string]> = [[`${templates}/${facts.example}.tsx`, root]]

  if (!facts.usesReadoutRow) return example

  return [...example, [`${templates}/ReadoutRow.tsx`, `${destination}/ReadoutRow.tsx`]]
}

export function plannedFiles(options: Options): string[] {
  return planFor(options).map(([, destination]) => destination)
}

/** Adds the surface's type-only dependency, keeping devDependencies key-sorted. */
function withTypeDependency(packageJson: string, options: Options): string {
  const dependency = factsFor(options.surface).typeDependency

  if (!dependency) return packageJson

  const parsed = JSON.parse(packageJson) as { devDependencies: Record<string, string> }
  const [name, range] = dependency

  parsed.devDependencies = Object.fromEntries(
    Object.entries({ ...parsed.devDependencies, [name]: range })
      .sort(([a], [b]) => a.localeCompare(b)),
  )

  return `${JSON.stringify(parsed, null, 2)}\n`
}

// Every refusal is checked before anything is written, so a rejected scaffold leaves no
// half-populated directory to clean up or, worse, to mount.
export async function scaffold(
  options: Options,
  cwd: string,
): Promise<{ directory: string; files: string[]; edited: string[]; snippets: string[] }> {
  const slugProblem = checkSlug(options.slug)
  if (slugProblem) throw new Error(slugProblem)

  if (options.mode === 'builtin' && !isCorePackage(cwd)) {
    throw new Error(
      'Built-in mode writes into src/core/plugins/ and only makes sense inside the '
      + '@collabdt/core package. Run this from core, or use --mode external.',
    )
  }

  const directory = resolveTarget(options.mode, options.slug, cwd)

  const targetProblem = checkTarget(directory)
  if (targetProblem) throw new Error(targetProblem)

  const tokens = tokensFor(options)
  const written: string[] = []

  for (const [source, destination] of planFor(options)) {
    let contents = render(await readFile(templatePath(source), 'utf8'), tokens)

    if (destination === 'package.json') contents = withTypeDependency(contents, options)

    const absolute = join(directory, destination)
    await mkdir(dirname(absolute), { recursive: true })
    await writeFile(absolute, contents, 'utf8')

    written.push(destination)
  }

  // A built-in plugin does not load unless it is in both manifests.ts and installed.ts.
  // Registering it here rather than leaving it to the author is the difference between a
  // working plugin and one where everything appears to have succeeded and nothing happens.
  const { edited, snippets } = options.mode === 'builtin'
    ? await registerBuiltin(cwd, options)
    : { edited: [], snippets: [] }

  return { directory, files: written, edited, snippets }
}
