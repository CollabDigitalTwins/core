// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

export type HighlightLevel = 'none' | 'hover' | 'selected'

export const HIGHLIGHT_COLOR = 0x73_CE_E2
export const HOVER_OPACITY = 0.15
export const SELECTED_OPACITY = 0.3

/** The selection overlay, one instance per consumer so each disposes its own. */
export function selectedMaterial(): THREE.Material {
  return new THREE.MeshBasicMaterial({
    color: HIGHLIGHT_COLOR,
    transparent: true,
    opacity: SELECTED_OPACITY,
    depthTest: false,
    userData: { _maxSelectedOpacity: SELECTED_OPACITY },
  })
}

/** The hover overlay, fainter than {@link selectedMaterial} and otherwise identical. */
export function hoverMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: HIGHLIGHT_COLOR,
    transparent: true,
    opacity: HOVER_OPACITY,
    depthTest: false,
  })
}
