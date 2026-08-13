// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { render, templatePath, tokensFor } from './render'
import { factsFor } from './surfaces'
import { checkSlug, checkTarget, isCorePackage, resolveTarget } from './target'

import type { Options } from './options'

/** Template file -> path inside the generated plugin. */
function planFor(options: Options): Array<[string, string]> {
  if (options.mode === 'builtin') {
    return [
      ['builtin/manifest.json', 'manifest.json'],
      [options.surface === 'map.legends' ? 'builtin/indexLegend.ts' : 'builtin/index.ts', 'index.ts'],
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
    [options.surface === 'map.legends' ? 'external/src/indexLegend.ts' : 'external/src/index.ts', 'src/index.ts'],
    ...bodyFiles(options),
  ]
}

/**
 * The body's component files, which is more than one for the example.
 *
 * The example composes a child component from its own file rather than defining it inline.
 * The bundle is still a single file, and that is the point: the delivery constraint says
 * nothing about how the source is organised, and a one-file example is read as saying a
 * plugin is one component.
 *
 * A legend has no empty variant. Its hook is the plugin, and an empty one would register a
 * section with no rows, which the host omits anyway. Routing the legend at `Empty.tsx`
 * would also emit invalid TypeScript, since that template interpolates a props type the
 * legend surface does not have.
 */
function bodyFiles(options: Options): Array<[string, string]> {
  const templates = options.mode === 'builtin' ? 'builtin/components' : 'external/src/components'
  const destination = options.mode === 'builtin' ? 'components' : 'src/components'
  const root = `${destination}/${tokensFor(options).COMPONENT}.tsx`

  if (options.surface === 'map.legends') {
    return [[`${templates}/ExampleLegend.tsx`, root]]
  }

  if (options.body === 'empty') {
    return [[`${templates}/Empty.tsx`, root]]
  }

  const suffix = { 'map.tools': 'Map', 'bim.tools': 'Bim', 'pointcloud.tools': 'Pointcloud' } as const

  return [
    [`${templates}/Example${suffix[options.surface]}.tsx`, root],
    [`${templates}/ReadoutRow.tsx`, `${destination}/ReadoutRow.tsx`],
  ]
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

/**
 * Writes the plugin folder.
 *
 * Every refusal is checked before anything is written, so a rejected scaffold leaves no
 * half-populated directory for the author to clean up or, worse, to mount.
 */
export async function scaffold(
  options: Options,
  cwd: string,
): Promise<{ directory: string; files: string[] }> {
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

  return { directory, files: written }
}
