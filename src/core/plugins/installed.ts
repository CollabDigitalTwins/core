import type { PluginEntry, PluginManifest } from './sdk/types'

/**
 * The plugins this app runs, in load order.
 *
 * To add a plugin: import its manifest and entry, then push a new entry onto this array.
 *   import * as myPlugin from './my-plugin'
 *   import myManifest from './my-plugin/manifest.json'
 *   INSTALLED_PLUGINS.push({ manifest: myManifest as PluginManifest, entry: myPlugin })
 *
 * To disable a plugin: comment out or remove its entry.
 */
export const INSTALLED_PLUGINS: Array<{
  manifest: PluginManifest
  entry: PluginEntry
}> = []
