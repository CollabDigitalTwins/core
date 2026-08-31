// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export interface CameraLimits {
    minDistance: number
    maxDistance: number
    near: number
    far: number
}

const FALLBACK_RADIUS = 10

const MIN_DISTANCE_FRACTION = 0.004
const MIN_DISTANCE_FLOOR = 0.05
const MAX_DISTANCE_FACTOR = 12
const NEAR_FRACTION = 0.001
const NEAR_FLOOR = 0.01
const FAR_HEADROOM = 3

/**
 * Dolly and clipping limits scaled to the model. Unbounded controls lose the model past the far
 * plane, and stall on the way in because the dolly step tracks the shrinking distance.
 */
export function cameraLimitsFor(radius: number | null | undefined): CameraLimits {
    const span = Number.isFinite(radius) && (radius ?? 0) > 0 ? (radius as number) : FALLBACK_RADIUS

    const minDistance = Math.max(span * MIN_DISTANCE_FRACTION, MIN_DISTANCE_FLOOR)
    const maxDistance = span * MAX_DISTANCE_FACTOR
    const near = Math.max(span * NEAR_FRACTION, NEAR_FLOOR)

    return {
        minDistance,
        maxDistance,
        near,
        // The far plane has to clear the furthest the camera can get plus the model behind it.
        far: (maxDistance + span) * FAR_HEADROOM,
    }
}
