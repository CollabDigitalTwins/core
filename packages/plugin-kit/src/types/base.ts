// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Pulls in the ambient declarations for `@collabdt/core/plugins-sdk*`. The dts bundler
// strips this directive, so `scripts/shipAmbientTypes.mjs` puts an equivalent one back on
// each built surface entry; the path is written to work from `src/types/` and
// `dist/types/` alike.
/// <reference path="./sdkModules.d.ts" />

import type * as React from 'react'

// Everything a plugin needs that costs nothing to depend on. The viewer surfaces live in
// sibling files because their prop types name the map and BIM libraries, which is what
// lets a map plugin typecheck without the BIM library installed and the reverse; each of
// those re-exports this file, so a plugin still has a single import path.
//
// These shapes mirror core's `sdk/types.ts` and `sdk/version.ts`. Core stays the source
// of truth, and `pluginKitTypes.test.ts` there fails if the two drift.

// --- Host contract version ---

/**
 * The plugin host contract version this kit targets. Declare it as `hostApi` in
 * your manifest: the host refuses to activate a plugin whose declared value
 * differs, rather than letting it fail somewhere less obvious at render time.
 *
 * It moves only on a change that breaks a correctly-written plugin. Additive
 * changes — a new capability, a new SDK hook — do not move it.
 */
export const PLUGIN_HOST_API = 1

// --- Capability definitions ---

/**
 * The capability strings core accepts in a manifest.
 *
 * `sidebar.items` and `viewer.panels` are listed because core still validates them
 * and would reject a manifest that used a string missing from this list. They have
 * no entry in `CapabilityRegistry` below, though: nothing in core renders them, so
 * there is deliberately no way to register one from a plugin. Registering a
 * contribution that never appears is worse than not being able to — the plugin
 * loads clean and there is nothing to debug.
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

// --- Registration shapes ---

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
 *
 * `icon` is a name, not a component: core resolves the string against its own icon
 * set. Core's own type also accepts a component, but a plugin naming icons by
 * string is what keeps the icon package out of a plugin's dependencies, so that is
 * the only form typeable here.
 */
export interface ToolbarRegistration<P = Record<string, unknown>> {
  id: string
  label: string
  icon: string
  component: React.ComponentType<ToolbarToolProps & P>
  cursor?: string
  stayActive?: boolean
}

// --- Capability → registration type map ---

/**
 * What each capability expects you to register.
 *
 * Generic over the four surface shapes rather than importing them, so this file
 * pulls in no viewer library. Bind the ones you use — each surface file exports a
 * ready-bound alias, and a plugin that spans two surfaces composes its own, e.g.
 * `CapabilityRegistry<MapToolProps, unknown, unknown, LegendRegistration>`.
 */
export interface CapabilityRegistry<
  MapProps = unknown,
  BimProps = unknown,
  PointCloudProps = unknown,
  Legend = unknown,
> {
  'map.tools': ToolbarRegistration<MapProps>
  'bim.tools': ToolbarRegistration<BimProps>
  'pointcloud.tools': ToolbarRegistration<PointCloudProps>
  'map.legends': Legend
}

// --- Plugin context ---

/**
 * What core hands your `activate()`.
 *
 * The type parameters are the same four surface shapes `CapabilityRegistry` takes,
 * and they have to be bound for `register` to accept a component typed against a
 * viewer: leaving them `unknown` means core would be promising your component
 * fewer props than it declares, which is a compile error at the `register` call.
 */
export interface PluginContext<
  MapProps = unknown,
  BimProps = unknown,
  PointCloudProps = unknown,
  Legend = unknown,
> {
  pluginId: string
  register<K extends keyof CapabilityRegistry>(
    key: K,
    item: CapabilityRegistry<MapProps, BimProps, PointCloudProps, Legend>[K],
  ): void
  config: Record<string, unknown>
}
