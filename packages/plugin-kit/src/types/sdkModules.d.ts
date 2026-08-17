// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Types for the SDK modules a plugin imports at runtime but never installs: the specifier is
// marked external, and the browser resolves it through the host's import map. Shipping
// declarations for implementations this package does not contain is the point.
//
// Module and export names come from PLUGIN_RUNTIME_SHIMS in core; signatures are copied from
// core's sdk/. React's shims are absent because they have real published types.
//
// No top-level import or export, deliberately: that keeps this a global script, the only place
// TypeScript accepts an ambient declaration for a specifier it cannot resolve.

declare module '@collabdt/core/plugins-sdk' {
  // Only the values the shim re-exports. The SDK's types live in the surface entries, so each
  // shape has one definition and it is the one a plugin already imports.
  export const VALID_CAPABILITIES: readonly [
    'data.pages',
    'viewer.tabs',
    'ui.dialogs',
    'map.tools',
    'bim.tools',
    'pointcloud.tools',
    'viewer.legends',
    'map.layers',
  ]

  export const PLUGIN_HOST_API: 1

  // A value, not just a type: a `viewer.tabs` contribution names its viewers.
  export const ViewerNames: {
    auth: 'auth'
    map: 'map'
    bim: 'bim'
    pointcloud: 'pointcloud'
    buildings: 'buildings'
    sites: 'sites'
    files: 'files'
    land: 'land'
    infrastructure: 'infrastructure'
    extensions: 'extensions'
    settings: 'settings'
    users: 'users'
  }

  /** Map-friendly, colourblind-accessible colours. Use these rather than inventing a set. */
  export const MAP_COLOUR_PALETTE: readonly string[]

  /** A stable colour from `MAP_COLOUR_PALETTE`, chosen by hashing the string. */
  export function stringToColour(str: string, variant?: 'min' | 'max'): string

  export function validateManifest(manifest: unknown): { valid: boolean; errors: string[] }

  // Generic because an ambient block cannot import `PluginEntry` from the kit's own entries,
  // and restating it would give a plugin two definitions. The call site behaves identically.
  export function resolvePluginEntry<E>(entry: E | (() => Promise<E>)): Promise<E>
}

declare module '@collabdt/core/plugins-sdk/config' {
  /** The plugin's config for this organization. Generic so a plugin can type its own shape. */
  export function usePluginConfig<
    T extends Record<string, unknown> = Record<string, unknown>,
  >(): T
  /** The calling plugin's id, from the scope its capability host established. */
  export function usePluginId(): string
}

declare module '@collabdt/core/plugins-sdk/messages' {
  export type PluginTranslator = (key: string, fallback?: string) => string

  /** A `t()` scoped to the calling plugin's own namespace. */
  export function usePluginTranslations(): PluginTranslator

  /** One piece of plugin text. All three parameters are required, matching core. */
  export function usePluginMessage(pluginId: string, key: string, fallback: string): string

  // Narrowed to a plain callable: typing next-intl's translator faithfully would drag
  // next-intl into a plugin's dependencies.
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

  /** Storage scoped by organization, plugin and collection. `T` is your declaration, not a guarantee. */
  export function usePluginStore<T = unknown>(collection: string): PluginStore<T>
}

declare module '@collabdt/core/plugins-sdk/state' {
  /**
   * Shared state for one plugin's surfaces: in memory, scoped to the plugin, gone when it is
   * disabled. `usePluginStore` is the persisted counterpart.
   */
  export function usePluginState<T>(
    key: string,
    initial: T,
  ): [T, (next: T | ((previous: T) => T)) => void]
}

declare module '@collabdt/core/plugins-sdk/ui' {
  export interface PluginDialogs {
    /** Opens one of this plugin's registered dialogs. `props` reaches the component as props. */
    open: (dialogId: string, props?: Record<string, unknown>) => void
    /** Closes the topmost instance of `dialogId`, or of any of this plugin's dialogs. */
    close: (dialogId?: string) => void
  }

  /** Opens and closes this plugin's `ui.dialogs` contributions from any of its surfaces. */
  export function usePluginDialogs(): PluginDialogs
}

declare module '@collabdt/core/plugins-sdk/components' {
  // Shapes come from `./components`, a real module here, which is what lets core's
  // pluginKitComponents.test.ts compare these declarations against the real components.
  //
  // Inline `import('./components')` rather than a top-level import: an import declaration
  // inside an ambient module cannot use a relative specifier (TS2439), and skipLibCheck hides
  // that from everyone until a consumer turns it off.

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
