// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { columns, useRows } from './components/{{COMPONENT}}'

import type { {{CONTEXT_TYPE}} } from '{{SURFACE_ENTRY}}'

// A full page in the app's Datasets nav, beside Buildings and Sites. The platform renders the
// frame, breadcrumb, title, search box and table; this plugin supplies the rows and the
// columns. A row click is where a detail view goes — register a `ui.dialogs` entry and open
// it from `onRowClick`.
//
// `register` may be called more than once. See the README before adding a second one:
// every capability has to be declared in the manifest, and each entry needs its own id.
export function activate(ctx: {{CONTEXT_TYPE}}): void {
  ctx.register('data.pages', {
    id: '{{SLUG}}',
    // Looked up in this plugin's own message namespace, falling back to the literal.
    titleKey: '{{NAME}}',
    // A string, resolved by the platform against its icon set. Naming it rather than
    // importing a component is what keeps `lucide-react` out of this plugin.
    icon: '{{ICON}}',
    useRows,
    columns,
  })
}
