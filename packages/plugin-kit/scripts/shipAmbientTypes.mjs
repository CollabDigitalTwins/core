// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Ships `src/types/sdkModules.d.ts` and re-attaches the reference to it.
//
// The ambient declarations for `@collabdt/core/plugins-sdk*` cannot live in `base.ts`:
// inside a module, `declare module '<unresolvable>'` is read as an augmentation of a
// missing module and rejected (TS2664). They therefore sit in a global `.d.ts` that
// `base.ts` pulls in with a `/// <reference path>` — and the dts bundler drops both the
// file (nothing imports it) and the directive (it rewrites the file that carried it).
// Without this copy-and-prepend, a plugin's `@collabdt/core/plugins-sdk/*` imports have
// no types on the other side.

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const AMBIENT = 'sdkModules.d.ts'
// Same specifier works from src/types and dist/types, so the source and the
// shipped copy carry an identical directive.
const DIRECTIVE = `/// <reference path="./${AMBIENT}" />`

const SURFACES = ['map', 'bim', 'pointcloud', 'legend']

const shipped = join(packageRoot, 'dist/types', AMBIENT)

copyFileSync(join(packageRoot, 'src/types', AMBIENT), shipped)

for (const surface of SURFACES) {
  const built = join(packageRoot, 'dist/types', `${surface}.d.ts`)
  const contents = readFileSync(built, 'utf8')

  if (contents.includes(DIRECTIVE)) continue

  writeFileSync(built, `${DIRECTIVE}\n${contents}`)
}

// Verify rather than assume: a bare `tsup` skips this script and drops the ambient file
// silently, and either failure below surfaces as someone else's broken build.
const problems = []

if (!existsSync(shipped)) {
  problems.push(`missing dist/types/${AMBIENT}`)
}

// The ambient modules import from `./components` and `./data`, which only exist in dist
// if those entries are still in tsup.config.ts.
for (const module of ['components', 'data']) {
  if (!existsSync(join(packageRoot, `dist/types/${module}.d.ts`))) {
    problems.push(`missing dist/types/${module}.d.ts, which dist/types/${AMBIENT} imports from`)
  }
}

for (const surface of SURFACES) {
  const built = join(packageRoot, 'dist/types', `${surface}.d.ts`)

  if (!existsSync(built)) {
    problems.push(`missing dist/types/${surface}.d.ts`)
    continue
  }

  const contents = readFileSync(built, 'utf8')
  const paths = [...contents.matchAll(/\/\/\/\s*<reference\s+path="([^"]+)"\s*\/>/g)].map(m => m[1])

  if (!paths.includes(`./${AMBIENT}`)) {
    problems.push(`dist/types/${surface}.d.ts does not carry ${DIRECTIVE}`)
  }

  // Every reference has to resolve, not just ours: a dts bundler that rewrites the
  // directive's path rather than stripping it leaves the loop above prepending a second,
  // correct one and the rewritten original behind — TS6053 in a consumer's build.
  for (const path of paths) {
    if (!existsSync(join(packageRoot, 'dist/types', path))) {
      problems.push(`dist/types/${surface}.d.ts references "${path}", which does not exist`)
    }
  }
}

if (problems.length > 0) {
  console.error(`shipAmbientTypes: ${problems.length} problem(s) after build:`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}
