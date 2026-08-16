// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { DEFAULT_KIT_SPEC, SURFACES } from './options'
import { render, templatePath, tokensFor } from './render'
import { factsFor } from './surfaces'

import type { Options, Surface } from './options'

const base: Options = {
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

const body = (surface: Surface) =>
  render(
    readFileSync(
      templatePath('external', 'src/components', `${factsFor(surface).example}.tsx`),
      'utf8',
    ),
    tokensFor({ ...base, surface }),
  )

const entry = (surface: Surface) =>
  render(
    readFileSync(
      templatePath('external', 'src', `${factsFor(surface).indexTemplate}.ts`),
      'utf8',
    ),
    tokensFor({ ...base, surface }),
  )

const TOOLBAR_SURFACES = SURFACES.filter(candidate => factsFor(candidate).usesReadoutRow)

describe('every example body', () => {
  for (const surface of SURFACES) {
    it(`reaches the ambient SDK types through the kit entry for ${surface}`, () => {
      // The `declare module` block for the SDK specifiers is reachable only through a kit
      // entry import, and one anywhere in the program is enough. A tab and a dialog need no
      // type from the kit, so for those it is the entry file that carries the import.
      expect(`${entry(surface)}${body(surface)}`).toContain(factsFor(surface).entry)
    })

    it(`never imports a library ${surface} must not bundle`, () => {
      const source = body(surface)

      for (const forbidden of ['three', 'lucide-react', '@thatopen/components-front']) {
        expect(source).not.toContain(`from '${forbidden}'`)
      }
    })

    it(`imports the viewer libraries type-only, if at all, for ${surface}`, () => {
      const source = body(surface)

      for (const library of ['maplibre-gl', '@thatopen/components']) {
        // A value import is the failure. `import type { … } from` is correct and expected.
        expect(source).not.toMatch(new RegExp(`^import (?!type)[^;]*from '${library}'`, 'm'))
      }
    })

    it(`carries the SPDX header for ${surface}`, () => {
      expect(body(surface)).toContain('SPDX-License-Identifier: AGPL-3.0-or-later')
    })

    it(`leaves no untranslated user-visible string for ${surface}`, () => {
      const source = body(surface)

      // Three shapes are all correct here: a body that shows text translates it inline; a
      // data page contributes `labelKey` strings the host resolves; and a map layer renders
      // nothing at all, so it has no string to translate.
      const translates = source.includes('usePluginTranslations')
      const contributesKeys = source.includes('labelKey')
      const rendersNothing = /return null\s*$/m.test(source)

      expect(translates || contributesKeys || rendersNothing).toBe(true)
    })

    it(`leaves no unrendered token for ${surface}`, () => {
      expect(body(surface)).not.toMatch(/\{\{[A-Z_]+\}\}/)
    })
  }
})

describe('the map example', () => {
  it('guards the nullable map rather than asserting it', () => {
    expect(body('map.tools')).toMatch(/if \(!map\) return/)
  })

  it('removes its listener on cleanup, or it keeps firing after a viewer switch', () => {
    expect(body('map.tools')).toContain('map.off(')
  })

  it('reads typed config through the generic, which the kit now declares', () => {
    expect(body('map.tools')).toContain('usePluginConfig<Config>()')
  })
})

describe('the BIM example', () => {
  it('takes the viewer through props rather than importing the library', () => {
    const source = body('bim.tools')

    expect(source).toContain('BimToolProps')
    expect(source).toMatch(/getItemsOfCategory|getProperties/)
  })

  it('makes spaces visible after listing them, which is the trap in this surface', () => {
    // IFCSPACE is hidden by default: it is volumetric and would obscure what it contains,
    // so listing spaces is not the same as showing them.
    expect(body('bim.tools')).toContain('setItemsVisible')
  })
})

describe('the point cloud example', () => {
  it('narrows the unknown viewer instead of asserting a type Potree does not publish', () => {
    const source = body('pointcloud.tools')

    expect(source).toMatch(/typeof|instanceof| in viewer/)
    expect(source).not.toContain('as any')
  })

  it('reports readiness, since the component renders before Potree finishes', () => {
    expect(body('pointcloud.tools')).toContain('ready')
  })
})

describe('the legend example', () => {
  it('registers a useLegend hook rather than a component', () => {
    expect(body('map.legends')).toContain('useLegend')
  })

  it('returns rows with a label and a colour', () => {
    const source = body('map.legends')

    expect(source).toContain('label')
    expect(source).toContain('color')
  })
})

describe('the example bodies compose a child component', () => {
  // The single-file bundle is a delivery property. A one-file example is read as saying a
  // plugin is one component, which is the wrong conclusion and an expensive one to reach
  // halfway through building something real.
  for (const surface of TOOLBAR_SURFACES) {
    it(`imports ReadoutRow from its own file for ${surface}`, () => {
      expect(body(surface)).toContain("from './ReadoutRow'")
      expect(body(surface)).toContain('<ReadoutRow')
    })

    it(`does not redeclare the row helper inline for ${surface}`, () => {
      expect(body(surface)).not.toMatch(/function ReadoutRow/)
    })
  }

  it('ships a ReadoutRow template that needs no tokens', () => {
    const source = readFileSync(
      templatePath('external', 'src/components', 'ReadoutRow.tsx'),
      'utf8',
    )

    expect(source).toMatch(/export function ReadoutRow/)
    expect(source).not.toMatch(/\{\{[A-Z_]+\}\}/)
  })
})

describe('the legend entry point', () => {
  const source = () =>
    render(
      readFileSync(templatePath('external', 'src/indexLegend.ts'), 'utf8'),
      tokensFor({ ...base, surface: 'map.legends' }),
    )

  it('registers the legend registration object, not a toolbar component', () => {
    expect(source()).toContain("ctx.register('map.legends'")
    expect(source()).toContain('useLegend')
    // On the property, not the word: the comment above the registration explains that a
    // legend is a hook rather than a component, and says so in prose.
    expect(source()).not.toMatch(/^\s*component:/m)
  })

  it('uses the legend-bound context type', () => {
    expect(source()).toContain('ctx: LegendPluginContext')
  })
})
