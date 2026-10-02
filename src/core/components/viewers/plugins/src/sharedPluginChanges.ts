// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { MountedPlugin } from './useMountedPlugins'

export type SharedPluginChange =
  | { kind: 'added'; name: string }
  | { kind: 'updated'; name: string; version: string }
  | { kind: 'removed'; name: string }

function sharedBySlug(plugins: MountedPlugin[]): Map<string, MountedPlugin> {
  return new Map(plugins.filter(plugin => plugin.source === 'registry').map(plugin => [plugin.manifest.slug, plugin]))
}

/** How the registry plugins shared with this organization differ between two listings of `/api/plugins/mounted`. */
export function sharedPluginChanges(before: MountedPlugin[], after: MountedPlugin[]): SharedPluginChange[] {
  const previous = sharedBySlug(before)
  const next = sharedBySlug(after)
  const changes: SharedPluginChange[] = []

  for (const [slug, plugin] of next) {
    const earlier = previous.get(slug)
    if (!earlier) changes.push({ kind: 'added', name: plugin.manifest.name })
    else if (earlier.registryVersion !== plugin.registryVersion) {
      changes.push({ kind: 'updated', name: plugin.manifest.name, version: plugin.registryVersion ?? plugin.manifest.version })
    }
  }
  for (const [slug, plugin] of previous) {
    if (!next.has(slug)) changes.push({ kind: 'removed', name: plugin.manifest.name })
  }
  return changes
}
