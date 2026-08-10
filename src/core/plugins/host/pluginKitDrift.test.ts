// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { PLUGIN_EXTERNALS } from './runtimeShims'
import { PLUGIN_EXTERNALS as KIT_EXTERNALS } from '../../../../packages/plugin-kit/src/externals'

/**
 * The kit ships the allowlist as a literal so it has no dependency on core. That
 * is the right trade for an external author's install size and the wrong one for
 * drift, so this closes the gap: adding a shim without updating the kit fails
 * here, in the repo where the shim was added.
 */
describe('@collabdt/plugin-kit', () => {
  it('marks external exactly what the host publishes a shim for', () => {
    expect([...KIT_EXTERNALS]).toEqual([...PLUGIN_EXTERNALS])
  })
})
