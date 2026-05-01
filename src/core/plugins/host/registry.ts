import type { PluginCapability } from '../sdk/types'

export interface RegistryEntry {
  pluginId: string
  id?: string
  [key: string]: unknown
}

export class PluginRegistry {
  private entries: Map<string, RegistryEntry[]> = new Map()

  register(extensionPoint: PluginCapability | string, entry: RegistryEntry): void {
    const list = this.entries.get(extensionPoint) ?? []

    // Prevent duplicate: same pluginId + same id
    if (entry.id) {
      const exists = list.some(e => e.pluginId === entry.pluginId && e.id === entry.id)
      if (exists) return
    }

    list.push(entry)
    this.entries.set(extensionPoint, list)
  }

  getAll<T extends RegistryEntry = RegistryEntry>(extensionPoint: string): T[] {
    return (this.entries.get(extensionPoint) ?? []) as T[]
  }

  deregisterAll(pluginId: string): void {
    for (const [point, entries] of this.entries) {
      this.entries.set(point, entries.filter(e => e.pluginId !== pluginId))
    }
  }

  clear(): void {
    this.entries.clear()
  }
}
