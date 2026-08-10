// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Ships `src/types/sdkModules.d.ts` and re-attaches the reference to it.
 *
 * The ambient declarations for `@collabdt/core/plugins-sdk*` cannot live in
 * `base.ts`: inside a module, `declare module '<unresolvable>'` is read as an
 * augmentation of a missing module and rejected (TS2664). They therefore sit in a
 * global `.d.ts` that `base.ts` pulls in with a `/// <reference path>` — and the
 * dts bundler drops both the file (nothing imports it) and the directive (it
 * rewrites the file that carried it).
 *
 * So copy the file next to the built surface entries and prepend the directive to
 * each of them. Without this a plugin's `import { Button } from
 * '@collabdt/core/plugins-sdk/components'` has no types on the other side.
 */

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const AMBIENT = 'sdkModules.d.ts'
// Same specifier works from src/types and dist/types, so the source and the
// shipped copy carry an identical directive.
const DIRECTIVE = `/// <reference path="./${AMBIENT}" />`

const SURFACES = ['map', 'bim', 'pointcloud', 'legend']

copyFileSync(
  join(packageRoot, 'src/types', AMBIENT),
  join(packageRoot, 'dist/types', AMBIENT),
)

for (const surface of SURFACES) {
  const built = join(packageRoot, 'dist/types', `${surface}.d.ts`)
  const contents = readFileSync(built, 'utf8')

  if (contents.includes(DIRECTIVE)) continue

  writeFileSync(built, `${DIRECTIVE}\n${contents}`)
}
