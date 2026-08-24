// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { componentNameFor, render, templatePath, tokensFor } from './render'
import { factsFor } from './surfaces'
import { checkSlug, checkTarget, resolveTarget } from './target'

import type { Options, Surface } from './options'

/** One output file: rendered from a template, or assembled here for a composed entry. */
interface PlannedFile {
  destination: string
  template?: string
  /** Renders with this surface's tokens and body-file name rather than the primary's. */
  surface?: Surface
}

const spansSurfaces = (options: Options) => options.surfaces.length > 1

const BODY_ROOT = 'src/components'

const TEMPLATE_TREE = 'external/src'

function shellFiles(): PlannedFile[] {
  return [
    { destination: 'manifest.json', template: 'external/manifest.json' },
    { destination: 'package.json', template: 'external/package.json' },
    { destination: 'tsconfig.json', template: 'external/tsconfig.json' },
    { destination: 'tsup.config.ts', template: 'external/tsup.config.ts' },
    { destination: '.gitignore', template: 'external/gitignore' },
    { destination: 'README.md', template: 'external/README.md' },
  ]
}

// No template can hold an entry for several surfaces, so `composeEntry` assembles that one.
function entryFile(options: Options): PlannedFile[] {
  const destination = 'src/index.ts'

  if (spansSurfaces(options)) return [{ destination }]

  const [surface] = options.surfaces

  return [{
    destination,
    template: `${TEMPLATE_TREE}/${factsFor(surface).indexTemplate}.ts`,
  }]
}

// Two files at minimum, so a reader does not infer that a plugin is one component.
function bodyFiles(options: Options): PlannedFile[] {
  const templates = `${TEMPLATE_TREE}/components`
  const destination = BODY_ROOT

  const bodies = options.surfaces.map((surface): PlannedFile => {
    const facts = factsFor(surface)
    const useEmpty = options.body === 'empty' && facts.allowsEmpty

    return {
      destination: `${destination}/${componentNameFor(options, surface)}.tsx`,
      template: `${templates}/${useEmpty ? 'Empty' : facts.example}.tsx`,
      surface,
    }
  })

  const needsReadout = options.body === 'example'
    && options.surfaces.some(surface => factsFor(surface).usesReadoutRow)

  if (!needsReadout) return bodies

  return [
    ...bodies,
    { destination: `${destination}/ReadoutRow.tsx`, template: `${templates}/ReadoutRow.tsx` },
  ]
}

function planFor(options: Options): PlannedFile[] {
  return [...shellFiles(), ...entryFile(options), ...bodyFiles(options)]
}

export function plannedFiles(options: Options): string[] {
  return planFor(options).map(file => file.destination)
}

// Sorts import lines by the specifier they end with, which is what `import/order` compares.
const bySpecifier = (a: string, b: string) =>
  (a.split(" from ")[1] ?? '').localeCompare(b.split(" from ")[1] ?? '')

/** Which `PluginContext` slot each surface binds, in the order the type parameters appear. */
const SLOT_TYPES: Array<{ surfaces: Surface[]; type: string; entry: string }> = [
  { surfaces: ['map.tools', 'map.layers'], type: 'MapToolProps', entry: 'map' },
  { surfaces: ['bim.tools'], type: 'BimToolProps', entry: 'bim' },
  { surfaces: ['pointcloud.tools'], type: 'PointCloudToolProps', entry: 'pointcloud' },
  { surfaces: ['viewer.legends'], type: 'LegendRegistration', entry: 'legend' },
]

// The kit binds one viewer slot per alias, so a plugin spanning viewers binds its own.
function contextType(options: Options): { declaration: string; imports: string[] } {
  const used = SLOT_TYPES.map(slot =>
    slot.surfaces.some(surface => options.surfaces.includes(surface)))

  // Stops at the last bound slot: trailing `unknown` parameters are already the defaults.
  const last = used.reduce((found, isUsed, index) => isUsed ? index : found, -1)
  const bound = SLOT_TYPES.slice(0, last + 1).map((slot, index) => used[index] ? slot.type : 'unknown')

  const imports = [
    "import type { PluginContext } from '@collabdt/plugin-kit/types/ui'",
    ...SLOT_TYPES
      .filter((_slot, index) => used[index])
      .map(slot => `import type { ${slot.type} } from '@collabdt/plugin-kit/types/${slot.entry}'`),
  ].sort(bySpecifier)

  return { declaration: `type Ctx = PluginContext<${bound.join(', ')}>`, imports }
}

async function fragmentFor(options: Options, surface: Surface): Promise<string> {
  const template = templatePath('fragments', `${factsFor(surface).indexTemplate}.ts`)
  const tokens = tokensFor(options, surface, componentNameFor(options, surface))

  return render(await readFile(template, 'utf8'), tokens).trimEnd()
}

async function composeEntry(options: Options): Promise<string> {
  const { declaration, imports } = contextType(options)

  const bodyImports = options.surfaces.map((surface) => {
    const component = componentNameFor(options, surface)
    const bindings = render(factsFor(surface).entryImports, { COMPONENT: component })

    return `import { ${bindings} } from './components/${component}'`
  }).sort(bySpecifier)

  const fragments = await Promise.all(
    options.surfaces.map(surface => fragmentFor(options, surface)),
  )

  return [
    '// SPDX-License-Identifier: AGPL-3.0-or-later',
    '// Copyright (C) 2025 Collab Digital Twins',
    '',
    ...bodyImports,
    '',
    ...imports,
    '',
    ...declaration ? [declaration, ''] : [],
    '// One plugin, several surfaces. They share state through `usePluginState`, so a selection',
    '// made in one is already there in the next, with no shared parent and no round trip.',
    'export function activate(ctx: Ctx): void {',
    fragments.join('\n\n'),
    '}',
    '',
  ].join('\n')
}

/** Adds every surface's type-only dependency, keeping devDependencies key-sorted. */
function withTypeDependencies(packageJson: string, options: Options): string {
  const dependencies = options.surfaces
    .map(surface => factsFor(surface).typeDependency)
    .filter((dependency): dependency is [string, string] => dependency !== null)

  if (dependencies.length === 0) return packageJson

  const parsed = JSON.parse(packageJson) as { devDependencies: Record<string, string> }

  parsed.devDependencies = Object.fromEntries(
    Object.entries({ ...parsed.devDependencies, ...Object.fromEntries(dependencies) })
      .sort(([a], [b]) => a.localeCompare(b)),
  )

  return `${JSON.stringify(parsed, null, 2)}\n`
}

// Every refusal is checked before anything is written, so a rejected scaffold leaves no
// half-populated directory to clean up or, worse, to mount.
export async function scaffold(
  options: Options,
  cwd: string,
): Promise<{ directory: string; files: string[] }> {
  if (options.surfaces.length === 0) throw new Error('Pick at least one surface.')

  const slugProblem = checkSlug(options.slug)
  if (slugProblem) throw new Error(slugProblem)

  const directory = resolveTarget(options.slug, cwd)

  const targetProblem = checkTarget(directory)
  if (targetProblem) throw new Error(targetProblem)

  const written: string[] = []

  for (const file of planFor(options)) {
    const component = file.surface && componentNameFor(options, file.surface)

    let contents = file.template
      ? render(
        await readFile(templatePath(file.template), 'utf8'),
        tokensFor(options, file.surface, component),
      )
      : await composeEntry(options)

    if (file.destination === 'package.json') contents = withTypeDependencies(contents, options)

    const absolute = join(directory, file.destination)
    await mkdir(dirname(absolute), { recursive: true })
    await writeFile(absolute, contents, 'utf8')

    written.push(file.destination)
  }

  return { directory, files: written }
}
