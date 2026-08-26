// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/* eslint-disable no-console -- This file is a terminal program: stdout is its user
   interface, not a debugging leftover. The rule is right everywhere else in the repo,
   where console output reaches nobody. */

import { execFileSync } from 'node:child_process'
import { dirname, relative, resolve } from 'node:path'

import prompts from 'prompts'

import { SURFACE_LABELS } from './labels'
import { externalNextSteps, forwardSlashes } from './nextSteps'
import { DEFAULT_KIT_SPEC, parseFlags, slugFromName, SURFACES } from './options'
import { scaffold } from './scaffold'
import { ALL_VIEWERS, viewersFor } from './viewers'

import type { Options, Surface } from './options'

const USAGE = `
Usage: create-cdt-plugin [options]

Scaffolds a CDT platform plugin. Run with no options to be prompted.

  --name <string>             Plugin name, e.g. "Room Inventory".
  --slug <string>             Folder name. Defaults to the name, hyphenated.
  --surface <capability>      ${SURFACES.join(' | ')}
                              Repeatable, and takes a comma-separated list, so one
                              plugin can span several surfaces.
  --body <example|empty>      example: reads the viewer. empty: renders its name.
  --author <string>           Defaults to git config user.name.
  --description <string>
  --yes, -y                   Skip the confirmation prompt.
  --help                      Show this.
`.trimStart()

function gitAuthor(): string {
  try {
    return execFileSync('git', ['config', 'user.name'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    // No git, or no configured name. Not worth failing over: the author is a manifest
    // field the person can edit.
    return ''
  }
}

// The one location nobody chose: no viewer surface to tie a tab or legend to means all three.
function warnOnEveryViewer(surfaces: Surface[]): void {
  const shared = surfaces.filter(
    surface => surface === 'viewer.tabs' || surface === 'viewer.legends',
  )

  if (shared.length === 0) return
  if (viewersFor(surfaces).length < ALL_VIEWERS.length) return

  console.warn(
    `\nHeads up: ${shared.join(' and ')} will appear in every viewer, because you picked no `
    + 'map, BIM or point cloud surface to tie it to. Narrow the `viewers` line in the generated '
    + 'entry if it belongs in only one.',
  )
}

async function main(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(USAGE)
    return
  }

  const flags = parseFlags(process.argv.slice(2))

  const missing = !flags.name || !flags.surfaces || !flags.body

  // A prompt with no TTY resolves immediately to undefined, which would scaffold a plugin
  // named "undefined" rather than failing. Refuse instead.
  if ((missing || !flags.yes) && !process.stdin.isTTY) {
    throw new Error(
      'No interactive terminal available. Pass --name, --surface, --body and --yes '
      + 'to run without prompts.',
    )
  }

  const answers = missing
    ? await prompts([
      { type: flags.name ? null : 'text', name: 'name', message: 'Plugin name:' },
      {
        type: flags.slug ? null : 'text',
        name: 'slug',
        message: 'Folder / slug:',
        initial: (_previous: unknown, values: { name?: string }) =>
          slugFromName(values.name ?? flags.name ?? ''),
      },
      {
        type: flags.surfaces ? null : 'multiselect',
        name: 'surfaces',
        message: 'Where should it appear? Pick as many as you need.',
        hint: 'space to select, a to toggle all, enter to confirm',
        instructions: false,
        min: 1,
        choices: SURFACES.map(surface => ({
          title: SURFACE_LABELS[surface].label,
          value: surface,
          description: SURFACE_LABELS[surface].description,
        })),
      },
      {
        type: flags.body ? null : 'select',
        name: 'body',
        message: 'Start from:',
        choices: [
          { title: 'A working example that reads the viewer', value: 'example' },
          { title: 'An empty plugin', value: 'empty' },
        ],
      },
      { type: flags.author ? null : 'text', name: 'author', message: 'Author:', initial: gitAuthor() },
      { type: flags.description ? null : 'text', name: 'description', message: 'Description:' },
    ], { onCancel: () => { throw new Error('Cancelled.') } })
    : {}

  // Flags win over answers: a field given on the command line was never prompted for, so
  // its answer is undefined and would otherwise overwrite it.
  const merged = { ...answers, ...flags } as Partial<Options>
  const name = merged.name ?? ''

  const options: Options = {
    name,
    slug: merged.slug ?? slugFromName(name),
    surfaces: merged.surfaces?.length ? merged.surfaces : ['map.tools'],
    body: merged.body ?? 'example',
    author: merged.author ?? gitAuthor(),
    description: merged.description ?? '',
    yes: merged.yes ?? false,
    kitSpec: merged.kitSpec ?? DEFAULT_KIT_SPEC,
  }

  if (!options.yes) {
    const { confirmed } = await prompts({
      type: 'confirm',
      name: 'confirmed',
      message: `Create ${options.surfaces.join(' + ')} plugin "${options.name}" `
        + `in ./${options.slug}?`,
      initial: false,
    }, { onCancel: () => { throw new Error('Cancelled.') } })

    if (!confirmed) {
      console.log('Nothing written.')
      return
    }
  }

  const { directory, files } = await scaffold(options, process.cwd())
  const where = forwardSlashes(relative(process.cwd(), directory)) || '.'

  console.log(`\nCreated ${files.length} files in ${where}\n`)

  warnOnEveryViewer(options.surfaces)

  console.log(externalNextSteps({
    where,
    pluginsDir: resolve(dirname(directory)),
    surfaces: options.surfaces,
  }))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
