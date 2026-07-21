// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

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
      registry.register(key, { ...(item as Record<string, unknown>), pluginId })
    },
  }
}
