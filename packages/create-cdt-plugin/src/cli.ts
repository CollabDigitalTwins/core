// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/* eslint-disable no-console -- This file is a terminal program: stdout is its user
   interface, not a debugging leftover. The rule is right everywhere else in the repo,
   where console output reaches nobody. */

import { execFileSync } from 'node:child_process'
import { relative } from 'node:path'

import prompts from 'prompts'

import { DEFAULT_KIT_SPEC, parseFlags, slugFromName, SURFACES } from './options'
import { scaffold } from './scaffold'

import type { Options, Surface } from './options'

const SURFACE_LABELS: Record<Surface, string> = {
  'map.tools': 'Map toolbar',
  'bim.tools': 'BIM toolbar',
  'pointcloud.tools': 'Point cloud toolbar',
  'map.legends': 'Map legend',
}

const USAGE = `
Usage: create-cdt-plugin [options]

Scaffolds a CDT platform plugin. Run with no options to be prompted.

  --mode <external|builtin>   external: dropped into a running deployment.
                              builtin: compiled into @collabdt/core.
  --name <string>             Plugin name, e.g. "Room Inventory".
  --slug <string>             Folder name. Defaults to the name, hyphenated.
  --surface <capability>      ${SURFACES.join(' | ')}
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

async function main(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(USAGE)
    return
  }

  const flags = parseFlags(process.argv.slice(2))

  const missing = !flags.mode || !flags.name || !flags.surface || !flags.body

  // A prompt with no TTY resolves immediately to undefined, which would scaffold a plugin
  // named "undefined" rather than failing. Refuse instead.
  if ((missing || !flags.yes) && !process.stdin.isTTY) {
    throw new Error(
      'No interactive terminal available. Pass --mode, --name, --surface, --body and --yes '
      + 'to run without prompts.',
    )
  }

  const answers = missing
    ? await prompts([
      {
        type: flags.mode ? null : 'select',
        name: 'mode',
        message: 'What kind of plugin?',
        choices: [
          { title: "One I'll drop into a running CDT platform", value: 'external' },
          { title: 'One built into the CDT platform itself', value: 'builtin' },
        ],
      },
      { type: flags.name ? null : 'text', name: 'name', message: 'Plugin name:' },
      {
        type: flags.slug ? null : 'text',
        name: 'slug',
        message: 'Folder / slug:',
        initial: (_previous: unknown, values: { name?: string }) =>
          slugFromName(values.name ?? flags.name ?? ''),
      },
      {
        type: flags.surface ? null : 'select',
        name: 'surface',
        message: 'Where should it appear?',
        choices: SURFACES.map(surface => ({ title: SURFACE_LABELS[surface], value: surface })),
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
    mode: merged.mode ?? 'external',
    name,
    slug: merged.slug ?? slugFromName(name),
    surface: merged.surface ?? 'map.tools',
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
      message: `Create ${options.surface} plugin "${options.name}" in ./${options.slug}?`,
      initial: false,
    }, { onCancel: () => { throw new Error('Cancelled.') } })

    if (!confirmed) {
      console.log('Nothing written.')
      return
    }
  }

  const { directory, files, edited, snippets } = await scaffold(options, process.cwd())
  const where = relative(process.cwd(), directory) || '.'

  console.log(`\nCreated ${files.length} files in ${where}\n`)

  if (options.mode === 'external') {
    console.log(`Next:\n  cd ${where}\n  npm install\n  npm run build\n`)
    console.log('Then mount the folder and enable the plugin. See the generated README.md.')
    return
  }

  if (edited.length > 0) console.log(`Registered it in:\n${edited.map(f => `  ${f}`).join('\n')}\n`)

  // Loud, because the alternative failure is silent: an unregistered built-in plugin loads
  // nothing and reports nothing, so everything looks like it worked.
  if (snippets.length > 0) {
    console.warn(
      'Could not edit the following automatically. The plugin will NOT load until these are\n'
      + 'added by hand:\n',
    )
    for (const snippet of snippets) console.warn(`${snippet}\n`)
  }

  console.log(`Then implement the component in ${where}/components/ and run the tests.`)

  // The scaffolder cannot import core, so it keeps a checked copy of the compiled-in slugs
  // and a drift test in core fails until the two agree. Without the slug there, this
  // scaffolder would later let someone create a *mounted* plugin of the same name, which
  // would load and then be ignored forever.
  console.log(
    `\nOne more: add '${options.slug}' to COMPILED_IN_SLUGS in\n`
    + '  packages/create-cdt-plugin/src/target.ts\n'
    + 'createCdtPluginDrift.test.ts in core fails until you do.',
  )
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
