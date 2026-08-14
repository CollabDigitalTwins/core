// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { {{COMPONENT}} } from './components/{{COMPONENT}}'

import type { {{CONTEXT_TYPE}} } from '{{SURFACE_ENTRY}}'

// `activate` is the whole entry contract: the platform calls it once with a context bound
// to this plugin's id and config.
//
// The context type is the surface-specific one, which binds the capability registry to
// this surface. Registering a component that expects a different viewer is then a compile
// error rather than a plugin that loads, registers and shows nothing.
//
// `register` may be called more than once. See the README before adding a second one:
// every capability has to be declared in the manifest, and each entry needs its own id.
export function activate(ctx: {{CONTEXT_TYPE}}): void {
  ctx.register('{{CAPABILITY}}', {
    id: '{{SLUG}}',
    label: '{{NAME}}',
    // A string, resolved by the platform against its icon set. Naming it rather than
    // importing a component is what keeps `lucide-react` out of this plugin.
    icon: '{{ICON}}',
    component: {{COMPONENT}},
    stayActive: true,
  })
}
