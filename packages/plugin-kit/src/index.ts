// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export { KNOWN_FORBIDDEN, PLUGIN_EXTERNALS } from './externals'
// The whole guard, not just its entry point. `preset.ts` refuses an `onSuccess` or
// `external` override and tells the author to call `assertBundleImports()` from their own
// post-build step, which needs the two path constants below or the advice is
// unfollowable; the smaller pieces are what a stricter or more forgiving check is built
// from.
export {
  assertBundleImports,
  canVerifyBundled,
  checkBundled,
  checkImports,
  collectBundledPackages,
  collectExternalImports,
} from './importGuard'
export type { BundleScanVerdict, Metafile } from './importGuard'
export { PLUGIN_METAFILE, PLUGIN_OUT_FILE, pluginPreset } from './preset'
