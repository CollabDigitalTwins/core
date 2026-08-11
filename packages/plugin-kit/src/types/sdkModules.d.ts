// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Ambient declarations for the SDK modules a plugin imports at runtime.
 *
 * A plugin writes `import { Button } from '@collabdt/core/plugins-sdk/components'`,
 * the bundler marks the specifier external, and the browser resolves it through the
 * host's import map to a shim backed by core's own singletons. Nothing is bundled,
 * so the plugin never installs `@collabdt/core` — but its typecheck still has to
 * know what those specifiers export. That is what this file supplies.
 *
 * Shipping declarations for implementations this package does not contain is the
 * point, not an oversight.
 *
 * The module list and the exported names are the ones in `PLUGIN_RUNTIME_SHIMS`
 * (core's `src/core/plugins/host/runtimeShims.ts`); the signatures are copied from
 * the matching file in core's `src/core/plugins/sdk/`. `react`, `react-dom` and
 * `react/jsx-runtime` are shimmed too, but they have real published types, so they
 * are absent here.
 *
 * This file has no top-level import or export on purpose. That keeps it a global
 * script, which is the only place TypeScript accepts an ambient module declaration
 * for a specifier it cannot resolve; inside a module the same block would be read
 * as an augmentation of a missing module and rejected.
 */

declare module '@collabdt/core/plugins-sdk' {
  /**
   * Only the four values the host shim re-exports at runtime. The SDK's *types*
   * live in `@collabdt/plugin-kit/types/<surface>` rather than being restated
   * here, so there is one definition of each shape and it is the one a plugin
   * already imports.
   */
  export const VALID_CAPABILITIES: readonly [
    'sidebar.items',
    'viewer.panels',
    'map.tools',
    'bim.tools',
    'pointcloud.tools',
    'map.legends',
  ]

  export const PLUGIN_HOST_API: 1

  export function validateManifest(manifest: unknown): { valid: boolean; errors: string[] }

  /**
   * Core declares this as `(entry: PluginSource['entry']) => Promise<PluginEntry>`.
   * It is generic here because an ambient block cannot import `PluginEntry` from
   * the kit's own type entries, and restating that interface would give a plugin
   * two definitions of it. The call site behaves identically.
   */
  export function resolvePluginEntry<E>(entry: E | (() => Promise<E>)): Promise<E>
}

declare module '@collabdt/core/plugins-sdk/config' {
  /** The plugin's own configuration, as stored for this organization. */
  export function usePluginConfig(): Record<string, unknown>
  /** The calling plugin's id, from the scope its capability host established. */
  export function usePluginId(): string
}

declare module '@collabdt/core/plugins-sdk/messages' {
  export type PluginTranslator = (key: string, fallback?: string) => string

  /** A `t()` scoped to the calling plugin's own namespace. */
  export function usePluginTranslations(): PluginTranslator

  /**
   * One piece of plugin-supplied text, with the manifest string as the fallback.
   * All three parameters are required, matching core.
   */
  export function usePluginMessage(pluginId: string, key: string, fallback: string): string

  /**
   * Core's own strings. Core returns next-intl's translator verbatim; it is
   * narrowed to a plain callable here because typing it faithfully would drag
   * `next-intl` into a plugin's dependencies, which is exactly what this package
   * exists to avoid.
   */
  export function useCoreTranslations(
    namespace: string,
  ): (key: string, values?: Record<string, unknown>) => string
}

declare module '@collabdt/core/plugins-sdk/store' {
  /** One stored document, as the owning plugin sees it. */
  export interface PluginDocument<T> {
    /** The plugin's own stable identifier for this document. */
    key: string
    data: T
    updatedAt: string | Date
  }

  export interface PluginStore<T> {
    items: PluginDocument<T>[]
    isLoading: boolean
    isError: unknown
    /** One document by key, or undefined. */
    get: (key: string) => PluginDocument<T> | undefined
    /** Create or replace a document. Keyed writes are upserts, not appends. */
    put: (key: string, data: T) => Promise<void>
    remove: (key: string) => Promise<void>
  }

  /**
   * Storage a plugin owns, scoped by organization, by plugin and by collection.
   * `T` is your declaration of the stored shape, not a guarantee.
   */
  export function usePluginStore<T = unknown>(collection: string): PluginStore<T>
}

declare module '@collabdt/core/plugins-sdk/components' {
  // Every shape comes from `./components`, which is a real module in this package
  // and therefore importable by path. That is what lets core's
  // `pluginKitComponents.test.ts` compare these declarations against the real
  // components; restating them inline here would leave nothing to compare against.
  //
  // Written as inline `import('./components')` types rather than a top-level
  // `import type … from './components'`: an import *declaration* inside an ambient
  // module cannot use a relative specifier (TS2439), and because this is a .d.ts
  // the usual `skipLibCheck: true` hides that from everyone until a consumer turns
  // it off. Inline import types have no such restriction.

  export type ButtonProps = import('./components').ButtonProps
  export const Button: import('./components').ButtonComponent

  export const Input: import('./components').InputComponent

  export type BadgeProps = import('./components').BadgeProps
  export const Badge: import('./components').BadgeComponent

  export type SeparatorProps = import('./components').SeparatorProps
  export const Separator: import('./components').SeparatorComponent

  export const Card: import('./components').CardComponent
  export const CardHeader: import('./components').CardComponent
  export const CardTitle: import('./components').CardComponent
  export const CardDescription: import('./components').CardComponent
  export const CardContent: import('./components').CardComponent
  export const CardFooter: import('./components').CardComponent

  export type DialogProps = import('./components').DialogProps
  export const Dialog: import('./components').DialogComponent

  export type DialogTriggerProps = import('./components').DialogTriggerProps
  export const DialogTrigger: import('./components').DialogTriggerComponent
  export const DialogClose: import('./components').DialogTriggerComponent

  export type DialogContentProps = import('./components').DialogContentProps
  export const DialogContent: import('./components').DialogContentComponent

  export const DialogHeader: import('./components').DialogSectionComponent
  export const DialogFooter: import('./components').DialogSectionComponent

  export type DialogTitleProps = import('./components').DialogTitleProps
  export const DialogTitle: import('./components').DialogTitleComponent

  export type DialogDescriptionProps = import('./components').DialogDescriptionProps
  export const DialogDescription: import('./components').DialogDescriptionComponent
}
