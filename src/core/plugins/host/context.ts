// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ViewerNames } from '../sdk/types'

import type { PluginRegistry } from './registry'
import type {
  PluginContext,
  PluginCapability,
  CapabilityRegistry,
} from '../sdk/types'

interface CreateContextOptions {
  pluginId: string
  capabilities: PluginCapability[]
  config: Record<string, unknown>
  registry: PluginRegistry
}

// `ViewerNames` also names routes like settings and users; only these three host contributions.
const TARGETABLE_VIEWERS = new Set<string>([
  ViewerNames.map,
  ViewerNames.bim,
  ViewerNames.pointcloud,
])

// A viewer name outside the three renders nowhere and throws nothing, so say so once here.
function warnOnUnknownViewers(pluginId: string, key: string, item: unknown): void {
  const { viewers } = item as { viewers?: unknown }
  if (!Array.isArray(viewers)) return

  const unknown = viewers.filter(viewer => !TARGETABLE_VIEWERS.has(viewer as string))
  if (unknown.length === 0) return

  console.warn(
    `Plugin "${pluginId}" targets unknown viewer(s) ${unknown.map(v => JSON.stringify(v)).join(', ')} `
    + `in its "${key}" contribution, so it renders nowhere. Valid viewers: `
    + `${[...TARGETABLE_VIEWERS].join(', ')}.`,
  )
}

export function createPluginContext(options: CreateContextOptions): PluginContext {
  const { pluginId, capabilities, config, registry } = options
  const declared = new Set<string>(capabilities)

  return {
    pluginId,
    config,
    register<K extends keyof CapabilityRegistry>(key: K, item: CapabilityRegistry[K]): void {
      if (!declared.has(key)) {
        throw new Error(
          `Plugin "${pluginId}" did not declare capability "${key}" in its manifest`,
        )
      }

      warnOnUnknownViewers(pluginId, key, item)

      // `pluginId` last, so a plugin cannot pass one and claim to be another. The
      // double cast is because the registration types have no index signature and
      // `RegistryEntry` needs one to store shapes keyed by capability.
      registry.register(key, { ...(item as unknown as Record<string, unknown>), pluginId })
    },
  }
}
