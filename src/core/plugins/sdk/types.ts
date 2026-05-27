import type { LucideProps } from 'lucide-react'

// --- Capability definitions ---

export const VALID_CAPABILITIES = [
  'sidebar.items',
  'viewer.panels',
  'map.tools',
  'bim.tools',
  'pointcloud.tools',
  'map.layers',
  'data.collections',
  'data.columns',
  'jobs',
  'commands',
  'widgets',
  'map.legends',
] as const

export type PluginCapability = typeof VALID_CAPABILITIES[number]

// --- Manifest ---

export interface PluginManifest {
  slug: string
  name: string
  version: string
  description?: string
  author?: string
  capabilities: PluginCapability[]
  requiredPermissions?: string[]
  configSchema?: Record<string, unknown>
}

export function validateManifest(manifest: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const m = manifest as Record<string, unknown>

  if (!m.slug || typeof m.slug !== 'string') errors.push('slug is required')
  if (!m.name || typeof m.name !== 'string') errors.push('name is required')
  if (!m.version || typeof m.version !== 'string') errors.push('version is required')

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

export interface ToolbarRegistration {
  id: string
  label: string
  icon: string | React.ComponentType<LucideProps>
  component: React.ComponentType<{ tool: unknown }>
  cursor?: string
  stayActive?: boolean
}

export interface ViewerRegistration {
  id: string
  label: string
  icon: string | React.ComponentType<LucideProps>
  component: React.ComponentType
}

export interface LayerRegistration {
  id: string
  label: string
  [key: string]: unknown
}

export interface DataCollectionRegistration {
  id: string
  label: string
  listComponent: React.ComponentType
  detailComponent?: React.ComponentType
}

export interface ColumnRegistration {
  id: string
  target: string
  [key: string]: unknown
}

export interface JobRegistration {
  id: string
  cron: string
  handler: () => Promise<void> | void
}

export interface CommandRegistration {
  id: string
  label?: string
  handler: (...args: unknown[]) => unknown
}

export interface WidgetRegistration {
  id: string
  label: string
  component: React.ComponentType
  width?: string
  height?: string
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
  'map.tools': ToolbarRegistration
  'bim.tools': ToolbarRegistration
  'pointcloud.tools': ToolbarRegistration
  'map.layers': LayerRegistration
  'data.collections': DataCollectionRegistration
  'data.columns': ColumnRegistration
  'jobs': JobRegistration
  'commands': CommandRegistration
  'widgets': WidgetRegistration
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
