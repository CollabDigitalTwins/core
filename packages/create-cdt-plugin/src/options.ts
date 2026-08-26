// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export type Body = 'example' | 'empty'

// Every capability core renders. A scaffold may pick several: one plugin spans surfaces and
// shares state between them, so the questionnaire multi-selects rather than forcing a choice.
export const SURFACES = [
  'map.tools',
  'bim.tools',
  'pointcloud.tools',
  'viewer.legends',
  'map.layers',
  'data.pages',
  'viewer.tabs',
  'ui.dialogs',
] as const

export type Surface = typeof SURFACES[number]

const BODIES: readonly Body[] = ['example', 'empty']

// Overridable with `--kit-spec` so the build tests can point at a local kit. Otherwise the
// only test proving a scaffolded plugin builds could not run until after the kit shipped.
export const DEFAULT_KIT_SPEC = '^0.5.0'

export interface Options {
  name: string
  slug: string
  surfaces: Surface[]
  body: Body
  author: string
  description: string
  yes: boolean
  kitSpec: string
}

/** Lowercase, hyphen-separated, and nothing a slug may not contain. */
export function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The `Options` keys that hold a plain string, which is every flag except `--yes`. */
type StringOption = 'name' | 'slug' | 'author' | 'description' | 'kitSpec'

/** Flag name as written on the command line, paired with the `Options` key it sets. */
const VALUE_FLAGS: Record<string, StringOption | 'surfaces' | 'body'> = {
  name: 'name',
  slug: 'slug',
  surface: 'surfaces',
  body: 'body',
  author: 'author',
  description: 'description',
  'kit-spec': 'kitSpec',
}

function oneOf<T extends string>(flag: string, value: string, allowed: readonly T[]): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`--${flag} must be one of: ${allowed.join(', ')}. Received "${value}".`)
  }

  return value as T
}

// `--surface` is repeatable and also takes a comma-separated list, so a multi-capability
// plugin is one flag or several. Duplicates are dropped: two contributions sharing an id
// would silently lose one, and the manifest would declare the same capability twice.
function withSurfaces(existing: Surface[] | undefined, value: string): Surface[] {
  const chosen = value.split(',').map(part => part.trim()).filter(part => part.length > 0)

  if (chosen.length === 0) throw new Error('--surface needs at least one capability.')

  const all = [...existing ?? [], ...chosen.map(part => oneOf('surface', part, SURFACES))]

  return [...new Set(all)]
}

// Returns only what was supplied, so the prompt flow can tell "not given" from "given empty".
// Unknown flags and bare positionals throw: `--surfce map.tools` falling back to a prompt, or
// hanging where there is no TTY, costs far more to diagnose than to reject.
export function parseFlags(argv: string[]): Partial<Options> {
  const options: Partial<Options> = {}

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (argument === '--yes' || argument === '-y') {
      options.yes = true
      continue
    }

    const match = /^--([a-z][a-z-]*)(?:=([\s\S]*))?$/.exec(argument)

    if (!match) {
      throw new Error(
        `Unexpected argument "${argument}". The folder name comes from --slug, not from a `
        + 'positional argument.',
      )
    }

    const [, flag, inlineValue] = match
    const key = VALUE_FLAGS[flag]

    if (!key) throw new Error(`Unknown flag "--${flag}".`)

    let value = inlineValue

    if (value === undefined) {
      const next = argv[index + 1]

      // A value that looks like a flag is a missing value, not a value. Consuming it
      // would silently drop the following flag as well.
      if (next === undefined || next.startsWith('--') || next === '-y') {
        throw new Error(`--${flag} needs a value.`)
      }

      value = next
      index += 1
    }

    switch (key) {
      case 'surfaces': options.surfaces = withSurfaces(options.surfaces, value); break
      case 'body': options.body = oneOf('body', value, BODIES); break
      // Narrowed to the string-valued keys by the switch above, so no cast is needed.
      default: options[key] = value
    }
  }

  return options
}
