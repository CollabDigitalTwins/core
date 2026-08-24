/**
 * Core message catalogs keyed by lowercase locale code.
 * The consuming app merges these under its own messages so that:
 *   1. App-level overrides win (same key in app beats core).
 *   2. Core's EN catalog backfills namespaces a locale hasn't translated yet.
 *
 * Plugin-owned catalogs are folded in here under a top-level `plugins` key, so a
 * plugin's strings resolve at `plugins.<slug>.<key>`. The nesting is what stops a
 * plugin colliding with a core namespace, or with another plugin. Plugins are
 * spread after any `plugins` block core itself defines, so each plugin owns its
 * own subtree and nothing else writes there.
 */
export declare const coreMessages: Record<string, Record<string, unknown>>;
//# sourceMappingURL=index.d.ts.map