// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { {{COMPONENT}} } from './components/{{COMPONENT}}'

import type { PluginContext } from '../sdk/types'

// A modal the host owns. Registering it here rather than rendering your own overlay is what
// lets any of this plugin's other surfaces open it by id — and what keeps it on screen when
// whatever opened it unmounts.
//
// Open it from anywhere in this plugin:
//   const { open } = usePluginDialogs()
//   open('{{SLUG}}', { someId: 42 })
//
// Isolation rule, enforced by ESLint: a plugin may import from `../sdk/*` and its own files,
// never from the rest of core.
export function activate(ctx: PluginContext): void {
  ctx.register('ui.dialogs', {
    id: '{{SLUG}}',
    // Looked up in this plugin's own message namespace, falling back to the literal.
    titleKey: '{{NAME}}',
    size: 'lg',
    component: {{COMPONENT}},
  })
}
