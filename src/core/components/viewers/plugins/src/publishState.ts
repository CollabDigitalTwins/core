// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { PluginManifest } from '../../../../plugins/sdk/types'
import type { RegistryPlugin } from '../types'

/** What the Publish button may do for one mounted plugin, given what the registry already holds. */
export type PublishState =
  | { kind: 'unpublished' }
  | { kind: 'update'; registryVersion: string }
  | { kind: 'alreadyPublished' }
  | { kind: 'behind'; registryVersion: string }
  | { kind: 'taken'; ownerName: string }

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/

/** Semver precedence, enough to tell a mounted build from the registry's newest; unparsable sorts first. */
export function compareVersions(a: string, b: string): number {
  const left = SEMVER.exec(a)
  const right = SEMVER.exec(b)
  if (!left || !right) return (left ? 1 : 0) - (right ? 1 : 0)

  for (let index = 1; index <= 3; index++) {
    const order = Number(left[index]) - Number(right[index])
    if (order !== 0) return order
  }
  if (!left[4] || !right[4]) return (left[4] ? -1 : 0) + (right[4] ? 1 : 0)
  return left[4].localeCompare(right[4], undefined, { numeric: true })
}

export function publishState(
  manifest: PluginManifest,
  entry: RegistryPlugin | undefined,
  canActOnAnyPlugin: boolean,
): PublishState {
  if (!entry) return { kind: 'unpublished' }
  if (!entry.ownedByMe && !canActOnAnyPlugin) return { kind: 'taken', ownerName: entry.owner.name }
  if (entry.versions.some(row => row.version === manifest.version)) return { kind: 'alreadyPublished' }

  const newest = entry.versions.reduce<string | null>(
    (best, row) => (!best || compareVersions(row.version, best) > 0 ? row.version : best),
    null,
  )
  if (!newest) return { kind: 'unpublished' }
  return compareVersions(manifest.version, newest) > 0
    ? { kind: 'update', registryVersion: newest }
    : { kind: 'behind', registryVersion: newest }
}
