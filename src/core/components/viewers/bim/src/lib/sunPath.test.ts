// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { nearestSampleToTime, sampleNearestRay, sunPathPoints, sunPathSamples } from './sunPath'

const OTTAWA = { latitude: 45.4215, longitude: -75.6972 }
const ARCTIC = { latitude: 78.22, longitude: 15.65 }

describe('sunPathSamples', () => {
    it('keeps only the part of the day the sun is up', () => {
        const samples = sunPathSamples('2026-06-21', OTTAWA.latitude, OTTAWA.longitude)

        expect(samples.length).toBeGreaterThan(0)
        expect(samples.every(s => s.elevation > 0)).toBe(true)
    })

    it('gives a longer arc at the summer solstice than at the winter one', () => {
        const summer = sunPathSamples('2026-06-21', OTTAWA.latitude, OTTAWA.longitude)
        const winter = sunPathSamples('2026-12-21', OTTAWA.latitude, OTTAWA.longitude)

        expect(summer.length).toBeGreaterThan(winter.length)
    })

    it('returns nothing through a polar night', () => {
        expect(sunPathSamples('2026-12-21', ARCTIC.latitude, ARCTIC.longitude)).toEqual([])
    })

    it('runs forward in time', () => {
        const samples = sunPathSamples('2026-06-21', OTTAWA.latitude, OTTAWA.longitude)

        for (let i = 1; i < samples.length; i++) {
            expect(samples[i].minutes).toBeGreaterThan(samples[i - 1].minutes)
        }
    })
})

describe('sunPathPoints', () => {
    it('puts every point on the dome around the centre', () => {
        const centre = new THREE.Vector3(10, 2, -4)
        const samples = sunPathSamples('2026-06-21', OTTAWA.latitude, OTTAWA.longitude)

        const points = sunPathPoints(samples, 50, centre)

        expect(points).toHaveLength(samples.length)
        for (const point of points) expect(point.distanceTo(centre)).toBeCloseTo(50)
    })

    it('turns the arc by the model north offset', () => {
        const centre = new THREE.Vector3()
        const samples = [{ minutes: 720, azimuth: 90, elevation: 0 }]

        const [aligned] = sunPathPoints(samples, 10, centre)
        const [turned] = sunPathPoints(samples, 10, centre, 90)

        expect(aligned.x).toBeCloseTo(10)
        expect(turned.z).toBeCloseTo(10)
        expect(turned.x).toBeCloseTo(0)
        expect(aligned.z).toBeCloseTo(0)
    })

    it('keeps the whole arc above the centre, since every sample is above the horizon', () => {
        const centre = new THREE.Vector3()
        const samples = sunPathSamples('2026-06-21', OTTAWA.latitude, OTTAWA.longitude)

        for (const point of sunPathPoints(samples, 50, centre)) expect(point.y).toBeGreaterThan(0)
    })
})

describe('nearestSampleToTime', () => {
    it('picks the closest sample either side', () => {
        const samples = sunPathSamples('2026-06-21', OTTAWA.latitude, OTTAWA.longitude)

        const noon = nearestSampleToTime(samples, 12 * 60)

        expect(noon).not.toBeNull()
        expect(Math.abs((noon?.minutes ?? 0) - 720)).toBeLessThanOrEqual(10)
    })

    it('returns null for an empty arc', () => {
        expect(nearestSampleToTime([], 720)).toBeNull()
    })
})

describe('sampleNearestRay', () => {
    it('resolves a ray aimed at one point back to that sample', () => {
        const centre = new THREE.Vector3()
        const samples = sunPathSamples('2026-06-21', OTTAWA.latitude, OTTAWA.longitude)
        const points = sunPathPoints(samples, 50, centre)
        const target = points[3]

        const origin = target.clone().multiplyScalar(3)
        const ray = new THREE.Ray(origin, target.clone().sub(origin).normalize())

        expect(sampleNearestRay(samples, points, ray)?.minutes).toBe(samples[3].minutes)
    })

    it('returns null for an empty arc', () => {
        const ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, 1))
        expect(sampleNearestRay([], [], ray)).toBeNull()
    })
})
