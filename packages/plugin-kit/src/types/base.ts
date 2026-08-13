// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// The dts bundler strips this directive, so scripts/shipAmbientTypes.mjs puts an equivalent
// one back on each built entry. The path works from src/types/ and dist/types/ alike.
/// <reference path="./sdkModules.d.ts" />

import type * as React from 'react'

// Mirrors core's sdk/types.ts and sdk/version.ts, which stay the source of truth;
// pluginKitTypes.test.ts there fails if the two drift. The viewer surfaces live in sibling
// files because their props name the map and BIM libraries, which is what lets a map plugin
// typecheck without the BIM library installed. Each re-exports this file.

/** Declare as `hostApi` in your manifest. The host refuses a plugin that declares another value. */
export const PLUGIN_HOST_API = 1

// `sidebar.items` and `viewer.panels` are here because core validates against this list, but
// they have no CapabilityRegistry entry: nothing renders them, so a plugin cannot register one.
export const VALID_CAPABILITIES = [
  'sidebar.items',
  'viewer.panels',
  'map.tools',
  'bim.tools',
  'pointcloud.tools',
  'map.legends',
] as const

export type PluginCapability = typeof VALID_CAPABILITIES[number]

export interface PluginManifest {
  slug: string
  name: string
  version: string
  /** Omitting this is allowed but warned about, which defers a version mismatch to render time. */
  hostApi?: number
  description?: string
  author?: string
  capabilities: PluginCapability[]
  requiredPermissions?: string[]
  configSchema?: Record<string, unknown>
  /** Strings by locale then key, folded into the app's tree under `plugins.<slug>`. May nest. */
  messages?: Record<string, Record<string, unknown>>
}

/** Every toolbar component receives the toolbar entry core built for it. */
export interface ToolbarToolProps {
  tool: unknown
}

// `icon` is a name, not a component: core resolves the string against its own icon set. Core's
// type also accepts a component, but naming icons by string is what keeps the icon package out
// of a plugin's dependencies, so it is the only form typeable here.
export interface ToolbarRegistration<P = Record<string, unknown>> {
  id: string
  label: string
  icon: string
  component: React.ComponentType<ToolbarToolProps & P>
  cursor?: string
  stayActive?: boolean
}

// Generic over the four surface shapes rather than importing them, so this file names no viewer
// library. Each surface file exports a ready-bound alias; a plugin spanning two composes its own.
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

// The surface parameters must be bound for `register` to accept a component typed against a
// viewer: left `unknown`, core promises fewer props than the component declares.
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
