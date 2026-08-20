// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { DEFAULT_KIT_SPEC } from './options'
import { render, templatePath, tokensFor } from './render'

import type { Options, Surface } from './options'

const options: Options = {
  mode: 'external',
  name: 'Room Inventory',
  slug: 'room-inventory',
  surfaces: ['map.tools'],
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

  it('depends on React types, without which the generated JSX does not typecheck', () => {
    expect(packageJson().devDependencies['@types/react']).toBeDefined()
  })

  it('depends on React types only, never the React package', () => {
    // The plugin needs React's types to compile and gets React itself from the platform at
    // runtime through the import map. Depending on the package would contradict that and
    // put a second copy within reach of an author's bundler.
    expect(packageJson().devDependencies.react).toBeUndefined()
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

describe('the empty body template', () => {
  const forSurface = (surface: Surface) =>
    render(
      readFileSync(templatePath('external', 'src/components', 'Empty.tsx'), 'utf8'),
      tokensFor({ ...options, surfaces: [surface], body: 'empty' }),
    )

  it('renders a props intersection for each toolbar surface', () => {
    expect(forSurface('map.tools')).toContain('ToolbarToolProps & MapToolProps')
    expect(forSurface('bim.tools')).toContain('ToolbarToolProps & BimToolProps')
    expect(forSurface('pointcloud.tools')).toContain('ToolbarToolProps & PointCloudToolProps')
  })

  it('is unusable for viewer.legends, which is why the scaffolder must never route it there', () => {
    // A legend has no toolbar props, so PROPS_TYPE is empty and this template renders
    // `ToolbarToolProps & ` — invalid TypeScript. `bodyFiles` sends viewer.legends to
    // ExampleLegend.tsx in both bodies; this pins the reason that is not a preference.
    expect(forSurface('viewer.legends')).toContain('ToolbarToolProps & )')
  })
})

describe('the empty entry point template', () => {
  const entry = (surface: Surface) =>
    render(
      readFileSync(templatePath('external', 'src', 'index.ts'), 'utf8'),
      tokensFor({ ...options, surfaces: [surface], body: 'empty' }),
    )

  it('registers under the chosen capability with the surface-bound context type', () => {
    expect(entry('map.tools')).toContain("ctx.register('map.tools'")
    expect(entry('map.tools')).toContain('ctx: MapPluginContext')
    expect(entry('bim.tools')).toContain('ctx: BimPluginContext')
  })

  it('names the icon by string, so a plugin never needs lucide-react', () => {
    expect(entry('map.tools')).toContain("icon: 'MapPin'")
    // The comment explaining why the icon is a string does mention the package, so the
    // assertion is on the import rather than on the word appearing anywhere.
    expect(entry('map.tools')).not.toMatch(/^import .*lucide-react/m)
  })

  it('uses the slug as the registration id, which must be unique within the plugin', () => {
    expect(entry('map.tools')).toContain("id: 'room-inventory'")
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
