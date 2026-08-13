// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { DEFAULT_KIT_SPEC } from './options'
import { render, templatePath, tokensFor } from './render'

import type { Options } from './options'

const options: Options = {
  mode: 'external',
  name: 'Room Inventory',
  slug: 'room-inventory',
  surface: 'map.tools',
  body: 'example',
  author: 'Nico',
  description: 'Counts rooms.',
  yes: true,
  kitSpec: DEFAULT_KIT_SPEC,
}

const rendered = (...segments: string[]) =>
  render(readFileSync(templatePath('external', ...segments), 'utf8'), tokensFor(options))

describe('the external manifest template', () => {
  const manifest = () => JSON.parse(rendered('manifest.json')) as Record<string, unknown>

  it('is valid JSON with the slug, name and capability filled in', () => {
    expect(manifest()).toMatchObject({
      slug: 'room-inventory',
      name: 'Room Inventory',
      capabilities: ['map.tools'],
    })
  })

  it('declares hostApi, so a future mismatch refuses to load instead of failing at render', () => {
    expect(manifest().hostApi).toBe(1)
  })

  it('ships all three locales, so translating later is an edit not a research task', () => {
    expect(Object.keys(manifest().messages as object)).toEqual(['en', 'fr', 'es'])
  })

  it('gives every locale the same keys, so a missing one is a translation not a bug', () => {
    const messages = manifest().messages as Record<string, Record<string, string>>
    const en = Object.keys(messages.en).sort()

    expect(Object.keys(messages.fr).sort()).toEqual(en)
    expect(Object.keys(messages.es).sort()).toEqual(en)
  })
})

describe('the external package.json template', () => {
  const packageJson = () => JSON.parse(rendered('package.json')) as {
    name: string
    private: boolean
    scripts: Record<string, string>
    devDependencies: Record<string, string>
  }

  it('is valid JSON named after the slug', () => {
    expect(packageJson().name).toBe('room-inventory')
  })

  it('has a build script, since a folder without dist/index.js is skipped at discovery', () => {
    expect(packageJson().scripts.build).toBe('tsup')
  })

  it('depends on the kit at whatever spec was chosen', () => {
    expect(packageJson().devDependencies['@collabdt/plugin-kit']).toBe(DEFAULT_KIT_SPEC)
  })

  it('never depends on @collabdt/core, which would pull three.js in to read a type', () => {
    expect(packageJson().devDependencies['@collabdt/core']).toBeUndefined()
  })

  it('never depends on a library a plugin must not bundle', () => {
    for (const forbidden of ['three', 'lucide-react', '@thatopen/components-front']) {
      expect(packageJson().devDependencies[forbidden]).toBeUndefined()
    }
  })

  it('is private, so a scaffolded plugin cannot be published by accident', () => {
    expect(packageJson().private).toBe(true)
  })
})

describe('the external tsconfig template', () => {
  const tsconfig = () => JSON.parse(rendered('tsconfig.json')) as {
    compilerOptions: Record<string, unknown>
  }

  it('resolves the kit subpath exports, which classic resolution cannot', () => {
    expect(tsconfig().compilerOptions.moduleResolution).toBe('bundler')
  })

  it('compiles JSX the way the preset builds it', () => {
    expect(tsconfig().compilerOptions.jsx).toBe('react-jsx')
  })

  it('is strict, so the SDK types are worth having', () => {
    expect(tsconfig().compilerOptions.strict).toBe(true)
  })

  it('declares no paths mapping for the SDK, which the kit supplies ambiently', () => {
    expect(tsconfig().compilerOptions.paths).toBeUndefined()
  })

  it('includes the DOM lib, since a plugin renders', () => {
    expect(tsconfig().compilerOptions.lib).toContain('DOM')
  })
})

describe('the external tsup config template', () => {
  it('is exactly the preset, with nothing an author can get wrong', () => {
    const source = rendered('tsup.config.ts')

    expect(source).toContain("from '@collabdt/plugin-kit'")
    expect(source).toContain('pluginPreset()')
  })

  it('passes the preset no overrides, since the ones that matter are refused anyway', () => {
    expect(rendered('tsup.config.ts')).not.toMatch(/pluginPreset\(\s*\{/)
  })
})

describe('the external gitignore template', () => {
  it('is stored without the leading dot, which npm would strip from the tarball', () => {
    expect(() => rendered('gitignore')).not.toThrow()
  })

  it('ignores the build output and dependencies', () => {
    const source = rendered('gitignore')

    expect(source).toContain('dist/')
    expect(source).toContain('node_modules/')
  })
})

describe('the external README template', () => {
  it('states the build, mount and enable steps and the no-sandbox warning', () => {
    const readme = rendered('README.md')

    expect(readme).toContain('npm run build')
    expect(readme).toMatch(/PLUGINS_DIR/)
    expect(readme).toMatch(/no sandbox/i)
  })

  it('says the French and Spanish strings are English copies awaiting translation', () => {
    expect(rendered('README.md')).toMatch(/transl/i)
  })

  it('tells the author a plugin may register more than one component', () => {
    const readme = rendered('README.md')

    expect(readme).toMatch(/register more than once|more than one component/i)
    expect(readme).toContain('manifest.capabilities')
  })

  it('warns that each registration needs its own id, which fails silently otherwise', () => {
    expect(rendered('README.md')).toMatch(/distinct `id`|unique `id`/)
  })
})

describe('every external template', () => {
  const FILES = [
    'manifest.json',
    'package.json',
    'tsconfig.json',
    'tsup.config.ts',
    'gitignore',
    'README.md',
  ]

  it('renders with no token left behind', () => {
    for (const file of FILES) {
      expect(rendered(file)).not.toMatch(/\{\{[A-Z_]+\}\}/)
    }
  })
})
