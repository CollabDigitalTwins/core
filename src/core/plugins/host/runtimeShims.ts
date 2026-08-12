// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** One bare specifier a runtime-loaded plugin may import, and the shim the host serves. */
export interface RuntimeShim {
  /** Filename served under `/plugin-runtime/`. */
  file: string
  /** Key on `globalThis.__CDT_RUNTIME__` that the host bridge populates. */
  bridge: string
  /** The bare specifier the plugin writes. */
  specifier: string
  /** Re-exported by name, because an import map cannot rewrite a namespace. */
  exports: string[]
}

// Part of the plugin host contract, which is why it lives here beside `PLUGIN_HOST_API`
// rather than in the app. Three consumers derive from it — the app's shim generator, the
// import map the document publishes, and `@collabdt/plugin-kit`'s build preset — and when
// they disagree a plugin either bundles a second copy of a singleton or dies on an
// unmapped specifier, neither failure naming the real cause.
//
// Deliberately absent: `@thatopen/components`, `three`, `maplibre-gl`, `lucide-react`. A
// plugin receives viewer instances as props and names icons by string, so it never
// imports those at runtime, which is what stops it loading a second copy of three.js.
// Adding one is a change to this list, not a change of design.
export const PLUGIN_RUNTIME_SHIMS: readonly RuntimeShim[] = [
  {
    file: 'react.js',
    bridge: 'react',
    specifier: 'react',
    exports: [
      'Children', 'Component', 'Fragment', 'Profiler', 'PureComponent',
      'StrictMode', 'Suspense', 'cloneElement', 'createContext',
      'createElement', 'createRef', 'forwardRef', 'isValidElement', 'lazy',
      'memo', 'startTransition', 'useCallback', 'useContext', 'useDebugValue',
      'useDeferredValue', 'useEffect', 'useId', 'useImperativeHandle',
      'useInsertionEffect', 'useLayoutEffect', 'useMemo', 'useReducer',
      'useRef', 'useState', 'useSyncExternalStore', 'useTransition', 'version',
    ],
  },
  {
    file: 'react-dom.js',
    bridge: 'reactDom',
    specifier: 'react-dom',
    exports: ['createPortal', 'flushSync', 'version'],
  },
  {
    file: 'jsx-runtime.js',
    bridge: 'jsxRuntime',
    specifier: 'react/jsx-runtime',
    exports: ['Fragment', 'jsx', 'jsxs'],
  },
  {
    file: 'sdk.js',
    bridge: 'sdk',
    specifier: '@collabdt/core/plugins-sdk',
    exports: ['VALID_CAPABILITIES', 'validateManifest', 'PLUGIN_HOST_API', 'resolvePluginEntry'],
  },
  {
    file: 'sdk-config.js',
    bridge: 'sdkConfig',
    specifier: '@collabdt/core/plugins-sdk/config',
    exports: ['usePluginConfig', 'usePluginId'],
  },
  {
    file: 'sdk-messages.js',
    bridge: 'sdkMessages',
    specifier: '@collabdt/core/plugins-sdk/messages',
    exports: ['usePluginMessage', 'usePluginTranslations', 'useCoreTranslations'],
  },
  {
    file: 'sdk-store.js',
    bridge: 'sdkStore',
    specifier: '@collabdt/core/plugins-sdk/store',
    exports: ['usePluginStore'],
  },
  {
    file: 'sdk-components.js',
    bridge: 'sdkComponents',
    specifier: '@collabdt/core/plugins-sdk/components',
    exports: [
      'Badge', 'Button', 'Input', 'Separator',
      'Card', 'CardContent', 'CardDescription', 'CardFooter', 'CardHeader', 'CardTitle',
      'Dialog', 'DialogClose', 'DialogContent', 'DialogDescription',
      'DialogFooter', 'DialogHeader', 'DialogTitle', 'DialogTrigger',
    ],
  },
]

/** Just the specifiers, which is what a bundler's `external` option wants. */
export const PLUGIN_EXTERNALS: readonly string[] = PLUGIN_RUNTIME_SHIMS.map(
  shim => shim.specifier,
)
