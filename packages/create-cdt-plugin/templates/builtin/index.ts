// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { {{COMPONENT}} } from './components/{{COMPONENT}}'

import type { PluginContext } from '../sdk/types'

// `activate` is the whole entry contract: the host calls it once with a context bound to this
// plugin's id and config.
//
// Isolation rule, enforced by ESLint: a plugin may import from `../sdk/*` and its own files,
// never from the rest of core. A plugin that cheats compiles here and breaks the moment it
// becomes a standalone plugin, which is the problem the boundary exists to prevent.
//
// `register` may be called more than once, but every capability has to be declared in
// manifest.json and each entry needs its own id.
export function activate(ctx: PluginContext): void {
  ctx.register('{{CAPABILITY}}', {
    id: '{{SLUG}}',
    label: '{{NAME}}',
    // A string, resolved by the host against its icon set, so a plugin never imports the
    // icon library.
    icon: '{{ICON}}',
    component: {{COMPONENT}},
    stayActive: true,
  })
}
