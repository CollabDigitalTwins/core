// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { pluginPreset } from '@collabdt/plugin-kit'

// Everything a CDT plugin's build has to get right lives in the preset: single-file ESM
// output, because the platform serves exactly one file per plugin, and a post-build guard
// that fails on any import the platform publishes no shim for.
//
// Overriding `entry`, `outDir`, `format`, `external` or `onSuccess` is refused rather than
// silently accepted, so there is nothing here to get wrong.
export default pluginPreset()
