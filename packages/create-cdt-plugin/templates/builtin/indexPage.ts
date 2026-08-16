// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { columns, useRows } from './components/{{COMPONENT}}'

import type { PluginContext } from '../sdk/types'

// A full page in the app's Datasets nav, beside Buildings and Sites. The host renders the
// frame, breadcrumb, title, search box and table; this plugin supplies the rows and the
// columns. A row click is where a detail view goes — register a `ui.dialogs` entry and open
// it from `onRowClick`.
//
// Isolation rule, enforced by ESLint: a plugin may import from `../sdk/*` and its own files,
// never from the rest of core.
export function activate(ctx: PluginContext): void {
  ctx.register('data.pages', {
    id: '{{SLUG}}',
    // Looked up in this plugin's own message namespace, falling back to the literal.
    titleKey: '{{NAME}}',
    // A string, resolved by the host against its icon set, so a plugin never imports the
    // icon library.
    icon: '{{ICON}}',
    useRows,
    columns,
  })
}
