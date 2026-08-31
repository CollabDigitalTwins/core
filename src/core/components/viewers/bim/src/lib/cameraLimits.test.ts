// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { cameraLimitsFor } from './cameraLimits'

describe('cameraLimitsFor', () => {
    it('keeps the far plane beyond the furthest the camera can dolly out', () => {
        const limits = cameraLimitsFor(50)

        expect(limits.far).toBeGreaterThan(limits.maxDistance + 50)
    })

    it('leaves room to get close without the near plane clipping the model', () => {
        const limits = cameraLimitsFor(50)

        expect(limits.near).toBeLessThan(limits.minDistance)
        expect(limits.near).toBeGreaterThan(0)
    })

    it('scales with the model, so a site and a room both behave', () => {
        const room = cameraLimitsFor(3)
        const site = cameraLimitsFor(400)

        expect(site.maxDistance).toBeGreaterThan(room.maxDistance)
        expect(site.minDistance).toBeGreaterThan(room.minDistance)
    })

    it('never lets minDistance reach zero, which is what stalls the dolly', () => {
        for (const radius of [0.0001, 1, 1000]) {
            expect(cameraLimitsFor(radius).minDistance).toBeGreaterThan(0)
        }
    })

    it('orders the limits sanely whatever it is given', () => {
        for (const radius of [null, undefined, 0, -5, Number.NaN, Number.POSITIVE_INFINITY, 250]) {
            const limits = cameraLimitsFor(radius as number)
            expect(limits.minDistance).toBeLessThan(limits.maxDistance)
            expect(limits.near).toBeLessThan(limits.far)
            expect(Number.isFinite(limits.far)).toBe(true)
        }
    })

    it('falls back to a usable scale when the model has no measurable size', () => {
        expect(cameraLimitsFor(null)).toEqual(cameraLimitsFor(0))
    })
})
