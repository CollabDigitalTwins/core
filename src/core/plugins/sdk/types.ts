// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Type-only: keeps the viewer modules' runtime deps (@thatopen, three, maplibre)
// out of the host's module graph.
import type { BimToolProps } from './bimViewer'
import type { MapToolProps } from './mapViewer'
import type { PointCloudToolProps } from './pointCloudViewer'
import type { ViewerNames } from '../../types/dbTypes'
import type { LucideProps } from 'lucide-react'

// --- Capability definitions ---

// Only capabilities core actually renders. One with no consumer registers fine,
// shows nothing, and leaves nothing to debug.
export const VALID_CAPABILITIES = [
  'sidebar.items',
  'viewer.panels',
  'map.tools',
  'bim.tools',
  'pointcloud.tools',
  'map.legends',
] as const

export type PluginCapability = typeof VALID_CAPABILITIES[number]

// --- Manifest ---

export interface PluginManifest {
  slug: string
  name: string
  version: string
  /** The `PLUGIN_HOST_API` this plugin was built against. Omitted is warned about, not rejected. */
  hostApi?: number
  description?: string
  author?: string
  capabilities: PluginCapability[]
  requiredPermissions?: string[]
  configSchema?: Record<string, unknown>
  /**
   * Strings keyed by locale then message key, e.g. `{ en: { title: 'Hello' } }`.
   * Core folds them under `plugins.<slug>`, so `t('title')` resolves and no plugin
   * can collide with another. Values may nest, addressed as `t('spaces.title')`.
   */
  messages?: Record<string, Record<string, unknown>>
}

export function validateManifest(manifest: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (typeof manifest !== 'object' || manifest === null) {
    return { valid: false, errors: ['manifest must be an object'] }
  }

  const m = manifest as Record<string, unknown>

  if (!m.slug || typeof m.slug !== 'string') errors.push('slug is required')
  if (!m.name || typeof m.name !== 'string') errors.push('name is required')
  if (!m.version || typeof m.version !== 'string') errors.push('version is required')

  if (m.hostApi !== undefined && !Number.isInteger(m.hostApi)) {
    errors.push('hostApi must be an integer when present')
  }

  if (!Array.isArray(m.capabilities) || m.capabilities.length === 0) {
    errors.push('at least one capability is required')
  } else {
    for (const cap of m.capabilities) {
      if (!VALID_CAPABILITIES.includes(cap as PluginCapability)) {
        errors.push(`invalid capability: "${cap}"`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

// --- Registration shapes (one per capability) ---

export interface SidebarRegistration {
  id: string
  label: string
  icon: string | React.ComponentType<LucideProps>
  component: React.ComponentType
}

/** Every toolbar component receives the toolbar entry core built for it. */
export interface ToolbarToolProps {
  tool: unknown
}

/**
 * A toolbar contribution. `P` is the viewer surface the hosting toolbar passes as
 * props, bound per capability by `CapabilityRegistry` — so a BIM component
 * registered under `map.tools` is a compile error.
 */
export interface ToolbarRegistration<P = Record<string, unknown>> {
  id: string
  label: string
  icon: string | React.ComponentType<LucideProps>
  component: React.ComponentType<ToolbarToolProps & P>
  cursor?: string
  stayActive?: boolean
}

export interface ViewerRegistration {
  id: string
  label: string
  icon: string | React.ComponentType<LucideProps>
  component: React.ComponentType
  /** Which viewers this panel appears in. Omit for all of them. */
  viewers?: ViewerNames[]
}

export interface LegendRow {
  label: string
  color: string
  count?: number
}

export interface LegendRegistration {
  id: string
  title: string
  // Called by <MapLegendHost> on each render; active:false omits the section.
  useLegend: () => {
    active: boolean
    // Overrides registration.title when set, e.g. a city-scoped label.
    title?: string
    unavailable?: boolean
    rows: LegendRow[]
  }
}

// --- Capability → registration type map ---
// A new contribution point needs one entry here, its type above, and a consumer
// calling `registry.getAll('your.key')`. No host changes.

export interface CapabilityRegistry {
  'sidebar.items': SidebarRegistration
  'viewer.panels': ViewerRegistration
  'map.tools': ToolbarRegistration<MapToolProps>
  'bim.tools': ToolbarRegistration<BimToolProps>
  'pointcloud.tools': ToolbarRegistration<PointCloudToolProps>
  'map.legends': LegendRegistration
}

// Errors if VALID_CAPABILITIES and keyof CapabilityRegistry drift apart.
type _CapabilityParity =
  PluginCapability extends keyof CapabilityRegistry
    ? keyof CapabilityRegistry extends PluginCapability
      ? true
      : never
    : never
const _capabilityParity: _CapabilityParity = true
void _capabilityParity

// --- Plugin Context ---

export interface PluginContext {
  pluginId: string
  register<K extends keyof CapabilityRegistry>(key: K, item: CapabilityRegistry[K]): void
  config: Record<string, unknown>
}

// --- Plugin entry point type ---

export interface PluginEntry {
  activate(ctx: PluginContext): void | Promise<void>
  deactivate?(ctx: PluginContext): void | Promise<void>
}

/**
 * One loadable plugin: its manifest plus its module, or a thunk returning it.
 * Prefer the thunk when compiled in — a static import pulls the plugin's
 * components into every route that reaches `installed.ts`.
 */
export interface PluginSource {
  manifest: PluginManifest
  entry: PluginEntry | (() => Promise<PluginEntry>)
}

/** Resolves either form of `PluginSource.entry` to the module. */
export async function resolvePluginEntry(
  entry: PluginSource['entry'],
): Promise<PluginEntry> {
  return typeof entry === 'function' ? entry() : entry
}

/** An array for compiled-in plugins; a thunk when the list itself must be fetched. */
export type PluginsInput = PluginSource[] | (() => Promise<PluginSource[]>)
