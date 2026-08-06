// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Type-only, so the viewer modules' runtime dependencies (@thatopen, three,
// maplibre) never reach the host's module graph.
import type { BimToolProps } from './bimViewer'
import type { MapToolProps } from './mapViewer'
import type { PointCloudToolProps } from './pointCloudViewer'
import type { ViewerNames } from '../../types/dbTypes'
import type { LucideProps } from 'lucide-react'

// --- Capability definitions ---

/**
 * A capability exists here if and only if core renders it. Declaring one that has
 * no consumer is worse than not having it: the plugin registers successfully,
 * nothing appears, and there is nothing to debug.
 *
 * Planned, deliberately absent until they have a consumer: `map.layers`,
 * `data.collections`, `data.columns`, `commands`, `widgets`. Also `jobs`, which
 * additionally needs server-side execution that a browser-loaded plugin bundle
 * cannot provide at all.
 */
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
  /**
   * The `PLUGIN_HOST_API` value this plugin was built against. Omitting it is
   * allowed but warned about: the host assumes the current API, which means a
   * future breaking change surfaces as a render-time failure rather than a
   * refusal to load.
   */
  hostApi?: number
  description?: string
  author?: string
  capabilities: PluginCapability[]
  requiredPermissions?: string[]
  configSchema?: Record<string, unknown>
  /**
   * The plugin's own strings, keyed by locale then by message key:
   *
   *   "messages": { "en": { "title": "Hello" }, "fr": { "title": "Bonjour" } }
   *
   * Kept in the manifest so a small plugin is a single file to write and a single
   * file to translate. Core folds them into the app's message tree under
   * `plugins.<slug>`, so `usePluginTranslations()` resolves `t('title')` and a
   * plugin can never collide with a core namespace or with another plugin.
   *
   * Entirely optional. A plugin that ships none still works: every SDK
   * translation call takes an inline fallback, which is what an untranslated
   * third-party plugin will rely on.
   *
   * Values may nest (`{ "spaces": { "title": "…" } }`), addressed as
   * `t('spaces.title')`.
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
 * A toolbar contribution.
 *
 * `P` is the viewer surface the hosting toolbar passes as props — `MapToolProps`
 * for `map.tools`, `BimToolProps` for `bim.tools`, and so on. Because
 * `CapabilityRegistry` binds it per capability, registering a component that
 * expects the BIM viewer under `map.tools` is a compile error rather than a
 * runtime surprise.
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
  /**
   * Which viewers this panel appears in. Omit for all of them.
   * A space-planning panel, for example, only makes sense in the BIM viewer.
   */
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
  // Called by <MapLegendHost> on each render. Re-runs when the plugin's live
  // store changes (live counts) and reads the plugin's enabled flag (active).
  // active:false ⇒ host omits this section.
  useLegend: () => {
    active: boolean
    // Overrides registration.title when set (e.g. a city-scoped label). Host resolves title ?? registration.title.
    title?: string
    unavailable?: boolean
    rows: LegendRow[]
  }
}

// --- Capability → registration type map ---
// Adding a new contribution point: add one entry here, define the type above,
// add a consumer that calls `registry.getAll('your.key')`. No host changes.

export interface CapabilityRegistry {
  'sidebar.items': SidebarRegistration
  'viewer.panels': ViewerRegistration
  'map.tools': ToolbarRegistration<MapToolProps>
  'bim.tools': ToolbarRegistration<BimToolProps>
  'pointcloud.tools': ToolbarRegistration<PointCloudToolProps>
  'map.legends': LegendRegistration
}

// Compile-time assertion: VALID_CAPABILITIES and keyof CapabilityRegistry must stay in sync.
// If this line errors, one list gained or lost an entry without the other.
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

/** One loadable plugin: its validated manifest plus its module. */
export interface PluginSource {
  manifest: PluginManifest
  entry: PluginEntry
}

/**
 * What the host loads. An array for plugins compiled into the bundle; a thunk for
 * plugins discovered at runtime, where the list itself has to be fetched first.
 */
export type PluginsInput = PluginSource[] | (() => Promise<PluginSource[]>)
