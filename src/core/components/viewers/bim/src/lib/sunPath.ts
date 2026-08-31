// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import { localInstant, sunDirection, sunPositionAt } from './solarPosition'

export interface SunPathSample {
    /** Minutes past local midnight. */
    minutes: number
    azimuth: number
    elevation: number
}

export const SUN_PATH_STEP_MINUTES = 10

/**
 * The sun's track across one local day at one place. Samples below the horizon are dropped, so
 * the result is the visible arc — empty on a polar night.
 */
export function sunPathSamples(
    isoDate: string,
    latitude: number,
    longitude: number,
    stepMinutes = SUN_PATH_STEP_MINUTES,
): SunPathSample[] {
    const samples: SunPathSample[] = []
    for (let minutes = 0; minutes < 1440; minutes += stepMinutes) {
        const { azimuth, elevation } = sunPositionAt(localInstant(isoDate, minutes), latitude, longitude)
        if (elevation > 0) samples.push({ minutes, azimuth, elevation })
    }
    return samples
}

/**
 * Places the samples on a dome of `radius` around `centre`. `northOffset` is how far the model
 * is turned from geographic north, so the arc lands over the building's real orientation.
 */
export function sunPathPoints(
    samples: SunPathSample[],
    radius: number,
    centre: THREE.Vector3,
    northOffset = 0,
) {
    return samples.map(({ azimuth, elevation }) =>
        sunDirection(azimuth + northOffset, elevation).multiplyScalar(radius).add(centre))
}

/** The sample whose time is closest to `minutes`, for parking the draggable marker. */
export function nearestSampleToTime(samples: SunPathSample[], minutes: number) {
    let best: SunPathSample | null = null
    for (const sample of samples) {
        if (!best || Math.abs(sample.minutes - minutes) < Math.abs(best.minutes - minutes)) best = sample
    }
    return best
}

/**
 * The sample whose point sits nearest the ray, which is how a drag on the canvas turns back
 * into a time of day without needing the pointer to land exactly on the line.
 */
export function sampleNearestRay(
    samples: SunPathSample[],
    points: THREE.Vector3[],
    ray: THREE.Ray,
): SunPathSample | null {
    let best: SunPathSample | null = null
    let bestDistance = Infinity
    const closest = new THREE.Vector3()

    for (let i = 0; i < points.length; i++) {
        ray.closestPointToPoint(points[i], closest)
        const distance = closest.distanceToSquared(points[i])
        if (distance < bestDistance) {
            bestDistance = distance
            best = samples[i]
        }
    }
    return best
}
