// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Type-only: keeps the viewer modules' runtime deps (@thatopen, three, maplibre)
// out of the host's module graph.
import type { BimToolProps } from './bimViewer'
import type { MapToolProps } from './mapViewer'
import type { PointCloudToolProps } from './pointCloudViewer'
// A value, not just a type: a `viewer.tabs` contribution names the viewers it belongs in.
export { ViewerNames } from '../../types/dbTypes'

import type { ViewerNames } from '../../types/dbTypes'

/**
 * The viewers that can host a tab or a legend, spelled as plain strings. Derived from
 * `ViewerNames` so the two cannot drift, and the form `@collabdt/plugin-kit` publishes.
 */
export type PluginViewerTarget = `${ViewerNames.map | ViewerNames.bim | ViewerNames.pointcloud}`
import type { LucideProps } from 'lucide-react'

// --- Capability definitions ---

// Only capabilities core actually renders. One with no consumer registers fine,
// shows nothing, and leaves nothing to debug.
export const VALID_CAPABILITIES = [
  'data.pages',
  'viewer.tabs',
  'ui.dialogs',
  'map.tools',
  'bim.tools',
  'pointcloud.tools',
  'viewer.legends',
  'map.layers',
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
  /** A lucide icon name shown beside the plugin's name. Unset or unknown shows a puzzle piece. */
  icon?: string
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

export interface DataPageColumn<Row> {
  key: string
  /** Resolved in the plugin's own namespace, falling back to the literal string. */
  labelKey: string
  render?: (row: Row) => React.ReactNode
}

/**
 * A full page in the Datasets nav, rendered by core. The plugin declares rows and columns; a
 * row click opens one of its own `ui.dialogs` rather than a detail view of its own.
 */
export interface DataPageRows<Row> {
  rows: Row[]
  isLoading?: boolean
  /** From the hook, not the registration, so it can close over `usePluginDialogs`. */
  onRowClick?: (row: Row) => void
}

export interface DataPageRegistration<Row = Record<string, unknown>> {
  id: string
  titleKey: string
  icon: string | React.ComponentType<LucideProps>
  useRows: () => DataPageRows<Row>
  columns: DataPageColumn<Row>[]
  /** Column keys the search box filters on. Omit to search every column. */
  searchKeys?: string[]
  emptyKey?: string
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

export interface ViewerTabRegistration {
  id: string
  labelKey: string
  icon: string | React.ComponentType<LucideProps>
  component: React.ComponentType
  /** Which viewers this tab appears in. Omit for all of them. */
  viewers?: Array<PluginViewerTarget | ViewerNames>
}

/**
 * A modal core owns. Registered here, opened by id from any of the plugin's surfaces via
 * `usePluginDialogs()`, so it outlives whichever one opened it.
 */
export interface DialogRegistration<P = Record<string, unknown>> {
  id: string
  titleKey: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  component: React.ComponentType<P & { close: () => void }>
}

/**
 * Something drawn on the map, mounted for as long as the map. Separate from `map.tools`,
 * whose panel unmounts when its dropdown closes and would take the layer with it.
 */
export interface MapLayerRegistration {
  id: string
  component: React.ComponentType<MapToolProps>
}

export interface LegendRow {
  label: string
  color: string
  count?: number
}

export interface LegendRegistration {
  id: string
  title: string
  /** Which viewers this legend appears in. Omit for all of them. */
  viewers?: Array<PluginViewerTarget | ViewerNames>
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
  'data.pages': DataPageRegistration
  'viewer.tabs': ViewerTabRegistration
  'ui.dialogs': DialogRegistration
  'map.tools': ToolbarRegistration<MapToolProps>
  'bim.tools': ToolbarRegistration<BimToolProps>
  'pointcloud.tools': ToolbarRegistration<PointCloudToolProps>
  'viewer.legends': LegendRegistration
  'map.layers': MapLayerRegistration
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
  // `any`: each plugin binds only the slots it uses, so no one context type fits them all.
  activate(ctx: any): void | Promise<void>
  deactivate?(ctx: any): void | Promise<void>
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
