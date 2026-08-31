// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'

/** Union of the loaded fragment models' boxes. The scene graph alone under-reports streamed tiles. */
export function modelBounds(components: OBC.Components | null | undefined): THREE.Box3 | null {
    if (!components) return null

    let fragments: OBC.FragmentsManager
    try {
        fragments = components.get(OBC.FragmentsManager)
    } catch {
        return null
    }

    const bounds = new THREE.Box3()
    let found = false
    for (const [, model] of fragments.list) {
        const box = model.box
        if (!box || box.isEmpty()) continue
        bounds.union(box)
        found = true
    }
    return found && !bounds.isEmpty() ? bounds : null
}

/**
 * The loaded models' yaw in degrees — project north. The sun turns with it, so only the map
 * placement decides which facade is lit.
 */
export function projectNorthRotation(components: OBC.Components | null | undefined): number {
    if (!components) return 0

    let fragments: OBC.FragmentsManager
    try {
        fragments = components.get(OBC.FragmentsManager)
    } catch {
        return 0
    }

    for (const [, model] of fragments.list) {
        const yaw = model.object?.rotation?.y
        if (typeof yaw === 'number' && yaw !== 0) return yaw * (180 / Math.PI)
    }
    return 0
}
