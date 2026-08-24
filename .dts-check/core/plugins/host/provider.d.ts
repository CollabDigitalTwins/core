import * as React from 'react';
import { PluginHost } from './host';
import { PluginRegistry } from './registry';
import type { CapabilityRegistry, PluginsInput } from '../sdk/types';
export interface PluginHostProviderProps {
    children: React.ReactNode;
    /**
     * The plugins to load. Defaults to the set compiled into core. Pass a stable
     * reference — a module-scope array or a `useCallback` thunk — since a fresh
     * literal re-resolves the list on every render.
     */
    plugins?: PluginsInput;
    /**
     * Slugs to activate. `undefined` activates everything, for consumers that do not
     * manage enablement. An array is authoritative: anything unlisted stays inactive,
     * and removing a slug deactivates that plugin in place, without a reload.
     */
    enabledSlugs?: string[];
    /** Per-plugin configuration, keyed by slug. Reaches the plugin as `ctx.config`. */
    configs?: Record<string, Record<string, unknown>>;
}
export declare function PluginHostProvider({ children, plugins, enabledSlugs, configs, }: PluginHostProviderProps): React.JSX.Element;
export declare function usePluginRegistry(): PluginRegistry;
export declare function usePluginsReady(): boolean;
/** The host itself. Only the plugins page needs this; capability consumers do not. */
export declare function usePluginHost(): PluginHost | null;
/**
 * Every plugin's configuration, keyed by slug, for capability hosts to pass into
 * `PluginScopeProvider`. Plugins use `usePluginConfig()` from the SDK instead — a plugin
 * component importing this module puts `installed.ts` and the host in a cycle.
 */
export declare function usePluginConfigs(): Record<string, Record<string, unknown>>;
export type PluginContribution<K extends keyof CapabilityRegistry> = CapabilityRegistry[K] & {
    pluginId: string;
};
/**
 * Read a capability's contributions and re-render when they change — the one way a host
 * component should consume the registry. `registry.getAll()` during render only works
 * when plugins load before first paint; a runtime-loaded plugin registers after the
 * consumer rendered, with nothing to tell it to look again.
 */
export declare function usePluginContributions<K extends keyof CapabilityRegistry>(key: K): PluginContribution<K>[];
//# sourceMappingURL=provider.d.ts.map