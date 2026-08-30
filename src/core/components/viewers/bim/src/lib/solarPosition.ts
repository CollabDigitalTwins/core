// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

export interface SunPosition {
    /** Compass bearing in degrees, 0 = north, increasing clockwise. */
    azimuth: number
    /** Degrees above the horizon. Negative means the sun is down. */
    elevation: number
}

const DEG = Math.PI / 180
const RAD = 180 / Math.PI

function julianDay(date: Date) {
    return date.getTime() / 86_400_000 + 2_440_587.5
}

function equationOfCenter(meanAnomaly: number) {
    return Math.sin(meanAnomaly) * 1.914602
        - Math.sin(2 * meanAnomaly) * 0.004817
        - Math.sin(3 * meanAnomaly) * 0.000014
}

/**
 * Sun azimuth and elevation for a moment and place, following the NOAA solar position
 * equations. Accurate to well under a degree, which is far finer than a shadow study needs.
 */
export function sunPositionAt(date: Date, latitude: number, longitude: number): SunPosition {
    const centuries = (julianDay(date) - 2_451_545) / 36_525

    const meanLongitude = (280.46646 + centuries * (36_000.76983 + centuries * 0.0003032)) % 360
    const meanAnomaly = (357.52911 + centuries * (35_999.05029 - centuries * 0.0001537)) * DEG
    const trueLongitude = (meanLongitude + equationOfCenter(meanAnomaly)) * DEG

    const obliquity = (23.439291 - centuries * 0.0130042) * DEG
    const declination = Math.asin(Math.sin(obliquity) * Math.sin(trueLongitude))
    const rightAscension = Math.atan2(
        Math.cos(obliquity) * Math.sin(trueLongitude),
        Math.cos(trueLongitude),
    )

    const siderealTime = (280.46061837 + 360.98564736629 * (julianDay(date) - 2_451_545)) % 360
    const hourAngle = (siderealTime + longitude) * DEG - rightAscension

    const lat = latitude * DEG
    const elevation = Math.asin(
        Math.sin(lat) * Math.sin(declination)
        + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle),
    )
    const azimuth = Math.atan2(
        Math.sin(hourAngle),
        Math.cos(hourAngle) * Math.sin(lat) - Math.tan(declination) * Math.cos(lat),
    )

    return {
        azimuth: ((azimuth * RAD + 180) % 360 + 360) % 360,
        elevation: elevation * RAD,
    }
}

/** Builds the instant a date-input value and a minutes-past-midnight slider describe, in local time. */
export function localInstant(isoDate: string, minutesPastMidnight: number) {
    const [year, month, day] = isoDate.split('-').map(Number)
    const date = new Date(year, (month ?? 1) - 1, day ?? 1)
    date.setMinutes(minutesPastMidnight)
    return date
}

/** Renders a minutes-past-midnight slider value as `HH:MM`. */
export function formatTimeOfDay(minutesPastMidnight: number) {
    const minutes = ((Math.round(minutesPastMidnight) % 1440) + 1440) % 1440
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0')
    const mm = String(minutes % 60).padStart(2, '0')
    return `${hh}:${mm}`
}

/**
 * Unit vector towards the sun in the scene's Y-up frame, where X is east and Y is up. That
 * makes -Z north, so a southern midday sun lands on +Z rather than behind the building.
 */
export function sunDirection(azimuth: number, elevation: number) {
    const polar = elevation * DEG
    const bearing = azimuth * DEG
    return new THREE.Vector3(
        Math.cos(polar) * Math.sin(bearing),
        Math.sin(polar),
        -Math.cos(polar) * Math.cos(bearing),
    )
}
