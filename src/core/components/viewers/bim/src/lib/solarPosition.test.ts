// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { formatTimeOfDay, localInstant, sunDirection, sunPositionAt } from './solarPosition'

const OTTAWA = { latitude: 45.4215, longitude: -75.6972 }

describe('sunPositionAt', () => {
    it('puts the summer-solstice noon sun high in the south for a northern city', () => {
        const { azimuth, elevation } = sunPositionAt(
            new Date('2026-06-21T17:00:00Z'), OTTAWA.latitude, OTTAWA.longitude,
        )

        expect(elevation).toBeGreaterThan(60)
        expect(azimuth).toBeGreaterThan(150)
        expect(azimuth).toBeLessThan(210)
    })

    it('puts the winter-solstice noon sun much lower at the same place', () => {
        const summer = sunPositionAt(new Date('2026-06-21T17:00:00Z'), OTTAWA.latitude, OTTAWA.longitude)
        const winter = sunPositionAt(new Date('2026-12-21T17:00:00Z'), OTTAWA.latitude, OTTAWA.longitude)

        expect(winter.elevation).toBeLessThan(summer.elevation - 40)
        expect(winter.elevation).toBeGreaterThan(0)
    })

    it('reports a negative elevation at local midnight', () => {
        const { elevation } = sunPositionAt(
            new Date('2026-06-21T05:00:00Z'), OTTAWA.latitude, OTTAWA.longitude,
        )

        expect(elevation).toBeLessThan(0)
    })

    it('rises in the east and sets in the west', () => {
        const morning = sunPositionAt(new Date('2026-06-21T11:00:00Z'), OTTAWA.latitude, OTTAWA.longitude)
        const evening = sunPositionAt(new Date('2026-06-21T23:00:00Z'), OTTAWA.latitude, OTTAWA.longitude)

        expect(morning.azimuth).toBeLessThan(180)
        expect(evening.azimuth).toBeGreaterThan(180)
    })

    it('mirrors the northern sun into the north for a southern latitude', () => {
        const { azimuth, elevation } = sunPositionAt(new Date('2026-06-21T02:00:00Z'), -33.87, 151.21)

        expect(elevation).toBeGreaterThan(0)
        expect(azimuth < 90 || azimuth > 270).toBe(true)
    })

    it('keeps azimuth inside a single turn', () => {
        for (let hour = 0; hour < 24; hour++) {
            const date = new Date(Date.UTC(2026, 2, 15, hour))
            const { azimuth } = sunPositionAt(date, OTTAWA.latitude, OTTAWA.longitude)
            expect(azimuth).toBeGreaterThanOrEqual(0)
            expect(azimuth).toBeLessThan(360)
        }
    })
})

describe('localInstant', () => {
    it('places the slider minutes on the chosen calendar day, in local time', () => {
        const instant = localInstant('2026-06-21', 13 * 60 + 30)

        expect(instant.getFullYear()).toBe(2026)
        expect(instant.getMonth()).toBe(5)
        expect(instant.getDate()).toBe(21)
        expect(instant.getHours()).toBe(13)
        expect(instant.getMinutes()).toBe(30)
    })
})

describe('formatTimeOfDay', () => {
    it('pads both halves', () => {
        expect(formatTimeOfDay(0)).toBe('00:00')
        expect(formatTimeOfDay(9 * 60 + 5)).toBe('09:05')
        expect(formatTimeOfDay(23 * 60 + 59)).toBe('23:59')
    })

    it('wraps a full day round to midnight', () => {
        expect(formatTimeOfDay(1440)).toBe('00:00')
    })
})

describe('sunDirection', () => {
    it('puts north on -Z and east on +X, the frame the viewer is built in', () => {
        expect(sunDirection(0, 0).z).toBeCloseTo(-1)
        expect(sunDirection(90, 0).x).toBeCloseTo(1)
        expect(sunDirection(180, 0).z).toBeCloseTo(1)
        expect(sunDirection(270, 0).x).toBeCloseTo(-1)
    })

    it('puts a northern-hemisphere midday sun to the south, not behind the viewer', () => {
        const { azimuth, elevation } = sunPositionAt(
            new Date('2026-06-21T17:00:00Z'), OTTAWA.latitude, OTTAWA.longitude,
        )

        const direction = sunDirection(azimuth, elevation)

        expect(direction.z).toBeGreaterThan(0)
        expect(direction.y).toBeGreaterThan(0)
    })

    it('sends the sun overhead at 90 degrees of elevation', () => {
        expect(sunDirection(0, 90).y).toBeCloseTo(1)
    })

    it('always returns a unit vector', () => {
        expect(sunDirection(217, 33).length()).toBeCloseTo(1)
    })
})
