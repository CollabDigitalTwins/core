// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Drift guard for `@collabdt/plugin-kit`'s restatement of core's plugin types.
//
// Constants are compared as values, shapes as types. Substring matches over the kit's
// source text are not enough — `toContain('icon: string')` passes with the line
// commented out.
//
// The per-surface confinement checks stay textual, since what they check is a property of
// the source, but they read module references parsed by TypeScript rather than searching
// the whole text, and assert on the exact set — so a new import has to be looked at.

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import {
  PLUGIN_HOST_API as KIT_PLUGIN_HOST_API,
  VALID_CAPABILITIES as KIT_VALID_CAPABILITIES,
} from '../../../../packages/plugin-kit/src/types/base'
import { VALID_CAPABILITIES } from '../sdk/types'
import { PLUGIN_HOST_API } from '../sdk/version'

import { runTsc, type TscRun } from './__tests__/tscProbe'

import type * as Kit from '../../../../packages/plugin-kit/src/types/base'
import type * as Core from '../sdk/types'

// --- Compile-time assertions ---

type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

type Same<A, B> = Exact<A, B> extends true ? true : { got: A, expected: B }
type Accepts<Given, Wanted> = [Given] extends [Wanted]
  ? true
  : { 'DRIFT: core would reject what the kit lets a plugin write': Given, expected: Wanted }

// As a union rather than the `as const` tuple, so reordering the list is not drift but
// adding or dropping one is.
const _capabilities: Same<Kit.PluginCapability, Core.PluginCapability> = true

// `icon` is where the kit deliberately parts company with core: core accepts a string
// *or* a Lucide component, and the kit types only the string, which keeps the icon
// package out of a plugin's dependencies. Both halves are asserted — exactly `string`,
// and still something core takes — because either alone is satisfiable by accident.
const _iconIsOnlyAString: Same<Kit.ToolbarRegistration['icon'], string> = true
const _iconIsStillValid: Accepts<
  Kit.ToolbarRegistration['icon'],
  Core.ToolbarRegistration['icon']
> = true

// The two shapes a plugin author writes by hand and hands to core. Assignability in that
// direction is the whole contract; the reverse is not required, because the kit is
// allowed to be narrower and `icon` above is exactly that.
const _manifest: Accepts<Kit.PluginManifest, Core.PluginManifest> = true
const _registration: Accepts<Kit.ToolbarRegistration, Core.ToolbarRegistration> = true

void [
  _capabilities,
  _iconIsOnlyAString, _iconIsStillValid,
  _manifest, _registration,
]

// --- The kit's source, as TypeScript parses it ---

const HERE = dirname(fileURLToPath(import.meta.url))
const KIT_TYPES = resolve(HERE, '../../../../packages/plugin-kit/src/types')

// Every module a file references: `import`, `export … from` and inline `import('…')`
// types alike. Parsed rather than matched, so a specifier named in a doc comment is not
// one of them — the failure this file exists to stop repeating.
function moduleReferences(file: string): string[] {
  const path = join(KIT_TYPES, file)
  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  )

  const found = new Set<string>()

  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier
      && ts.isStringLiteral(node.moduleSpecifier)
    ) {
      found.add(node.moduleSpecifier.text)
    }

    if (
      ts.isImportTypeNode(node)
      && ts.isLiteralTypeNode(node.argument)
      && ts.isStringLiteral(node.argument.literal)
    ) {
      found.add(node.argument.literal.text)
    }

    ts.forEachChild(node, visit)
  }

  visit(source)

  return [...found].sort()
}

// --- The runtime half ---

// One run per file, shared by the assertions below.
let cachedRun: TscRun | undefined
const tscRun = () => (cachedRun ??= runTsc('pluginKitTypes.test.ts'))

describe('@collabdt/plugin-kit types', () => {
  it('declares the same host API version core enforces', () => {
    expect(KIT_PLUGIN_HOST_API).toBe(PLUGIN_HOST_API)
  })

  it('lists exactly the capabilities core accepts', () => {
    // Sorted: the list is a validation set, so its order carries no meaning and a
    // reorder in core is not something a plugin author should have to react to.
    expect([...KIT_VALID_CAPABILITIES].sort()).toEqual([...VALID_CAPABILITIES].sort())
  })

  it('actually ran the compiler over the assertions above', () => {
    const run = tscRun()

    expect([0, 1, 2]).toContain(run.status)
    expect(run.compiledTheFile).toBe(true)
    expect(run.fileCount).toBeGreaterThan(1)
    expect(run.checked).toBe(true)
  }, 180_000)

  it('restates shapes core still accepts', () => {
    expect(tscRun().diagnostics.join('\n')).toBe('')
  }, 180_000)

  it('keeps the heavy viewer libraries out of the shared base', () => {
    // `react` is type-only and erased; nothing else may be named here at all,
    // because every surface file re-exports this one.
    expect(moduleReferences('base.ts')).toEqual(['react'])
    expect(moduleReferences('components.ts')).toEqual(['react'])
  })

  it('confines each viewer library to its own surface file', () => {
    // Exact sets, not "does not contain": a surface file gaining an import is the
    // event worth reviewing, whichever library it names.
    expect(moduleReferences('map.ts')).toEqual(['./base', 'maplibre-gl'])
    expect(moduleReferences('bim.ts')).toEqual(['./base', '@thatopen/components'].sort())
    expect(moduleReferences('pointcloud.ts')).toEqual(['./base'])
    expect(moduleReferences('legend.ts')).toEqual(['./base'])
  })

  it('keeps the ambient SDK declarations free of anything a plugin must install', () => {
    // The one module it may name is the kit's own components file, which is where
    // the component shapes live so that core can compare against them.
    expect(moduleReferences('sdkModules.d.ts')).toEqual(['./components'])
  })
})
