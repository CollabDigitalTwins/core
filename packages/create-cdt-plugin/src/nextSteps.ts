// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { SURFACE_LABELS } from './labels'

import type { Surface } from './options'

interface NextSteps {
  /** The scaffolded folder, relative to where the CLI ran. */
  where: string
  /** Absolute path to the folder holding it, which is what PLUGINS_DIR wants. */
  pluginsDir: string
  surfaces: Surface[]
}

/** A backslash is an escape in a .env value and in a POSIX shell; Windows reads `/` fine. */
export const forwardSlashes = (path: string) => path.replace(/\\/g, '/')

/**
 * The closing message for a mounted plugin: build, mount, enable, and where to look.
 *
 * One command per line, never joined with `&&`: Windows PowerShell 5.1 rejects `&&` as a
 * statement separator, and it is the default shell on the platform most self-hosters use.
 */
export function externalNextSteps({ where, pluginsDir, surfaces }: NextSteps): string {
  const folder = forwardSlashes(where)
  const places = surfaces.map(surface => SURFACE_LABELS[surface].label).join(', ')

  return [
    'Next — build it. Nothing is served until dist/index.js exists:',
    '',
    `  cd ${folder}`,
    '  npm install',
    '  npm run build',
    '',
    'Then, to run it. Add these to your .env — PLUGINS_DIR has to be an absolute path to a',
    'folder on your machine, because it defaults to the container path /app/plugins:',
    '',
    '  PLUGINS_ENABLED=true',
    `  PLUGINS_DIR=${forwardSlashes(pluginsDir)}`,
    '  PLUGINS_DEV=true',
    '',
    '  1. Refresh the Plugins page — it appears under "Found on this server"',
    '  2. An administrator adds it to the organization, then each person turns it on',
    `  3. Look for it in: ${places}`,
    '',
    'Running CDT in Docker? Compose sets PLUGINS_DIR itself and mounts the folder read-only,',
    'so run the build on the host, not in the container. Without PLUGINS_DEV=true a rebuild',
    'needs a restart to be picked up. More in the generated README.md.',
  ].join('\n')
}
