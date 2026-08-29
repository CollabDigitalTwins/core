// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

import type * as OBF from '@thatopen/components-front'

export const CUT_STYLE = 'Black'

/**
 * Registers the black cap drawn where a cut meets solid geometry. Both the section planes and the
 * section box draw with it, and either may be the first to ask, so this is idempotent.
 */
export function ensureCutStyle(styler: OBF.ClipStyler): void {
  if (styler.styles.has(CUT_STYLE)) return

  styler.styles.set(CUT_STYLE, {
    linesMaterial: new LineMaterial({
      color: 'black',
      linewidth: 2,
    }),
    fillsMaterial: new THREE.MeshBasicMaterial({
      color: 0x000000,
      // See the cap from both sides.
      side: THREE.DoubleSide,
    }),
  })
}
