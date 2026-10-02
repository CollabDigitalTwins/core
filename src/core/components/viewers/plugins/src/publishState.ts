// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { compareVersions, highestVersion } from '../../../../plugins/sdk/semver'

import type { PluginManifest } from '../../../../plugins/sdk/types'
import type { RegistryPlugin } from '../types'

/** What the Publish button may do for one mounted plugin, given what the registry already holds. */
export type PublishState =
  | { kind: 'unpublished' }
  | { kind: 'update'; registryVersion: string }
  | { kind: 'alreadyPublished' }
  | { kind: 'behind'; registryVersion: string }
  | { kind: 'taken'; ownerName: string }

const PUBLISH_KINDS: ReadonlySet<string> = new Set<PublishState['kind']>(['unpublished', 'update', 'alreadyPublished', 'behind', 'taken'])

export function isPublishState(standing: { kind: string }): standing is PublishState {
  return PUBLISH_KINDS.has(standing.kind)
}

export function publishState(
  manifest: PluginManifest,
  entry: RegistryPlugin | undefined,
  canActOnAnyPlugin: boolean,
): PublishState {
  if (!entry) return { kind: 'unpublished' }
  if (!entry.ownedByMe && !canActOnAnyPlugin) return { kind: 'taken', ownerName: entry.owner.name }
  if (entry.versions.some(row => row.version === manifest.version)) return { kind: 'alreadyPublished' }

  const newest = highestVersion(entry.versions)?.version
  if (!newest) return { kind: 'unpublished' }
  return compareVersions(manifest.version, newest) > 0
    ? { kind: 'update', registryVersion: newest }
    : { kind: 'behind', registryVersion: newest }
}
