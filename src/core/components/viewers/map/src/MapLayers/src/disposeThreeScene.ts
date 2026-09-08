// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { disposeObject3D } from '../../../../bim/src/lib/disposeObject3D'

import type * as THREE from 'three'

/**
 * Frees every GPU resource in a scene: geometries, materials and their textures.
 * Call before nulling a scene out, or the WebGL allocations outlive it.
 */
export function disposeThreeScene(scene: THREE.Scene): void {
    disposeObject3D(scene)
}
