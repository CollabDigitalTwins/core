// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { {{COMPONENT}} } from './components/{{COMPONENT}}'

import type { {{CONTEXT_TYPE}} } from '{{SURFACE_ENTRY}}'

// A modal the platform owns. Registering it here rather than rendering your own overlay is
// what lets any of this plugin's other surfaces open it by id — and what keeps it on screen
// when whatever opened it unmounts.
//
// Open it from anywhere in this plugin:
//   const { open } = usePluginDialogs()
//   open('{{SLUG}}', { someId: 42 })
//
// `register` may be called more than once. See the README before adding a second one:
// every capability has to be declared in the manifest, and each entry needs its own id.
export function activate(ctx: {{CONTEXT_TYPE}}): void {
  ctx.register('ui.dialogs', {
    id: '{{SLUG}}',
    // Looked up in this plugin's own message namespace, falling back to the literal.
    titleKey: '{{NAME}}',
    size: 'lg',
    component: {{COMPONENT}},
  })
}
