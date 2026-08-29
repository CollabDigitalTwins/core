// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { placementFromPivotDrag, placementWithPivot } from './pointCloudPivot'
import { DEFAULT_PLACEMENT } from './pointCloudPlacement'
import { placementToMatrix } from './pointCloudTransform'

import type { PointCloudPlacement } from './pointCloudPlacement'

/** Where a world point ends up once a placement is applied, i.e. what the viewer draws. */
const throughPlacement = (placement: PointCloudPlacement, local: THREE.Vector3) =>
  local.clone().applyMatrix4(placementToMatrix(placement))

/** A UTM-style scan: its own origin is 4000 km from the data the user is looking at. */
const SCAN_ORIGIN = { ...DEFAULT_PLACEMENT, sourceUp: 'y' as const }
const NEAR_THE_POINTS = new THREE.Vector3(500_000, 4_000_000, 100)

describe('placementWithPivot', () => {
  it('passes the placement through when no pivot is chosen', () => {
    const next = { ...SCAN_ORIGIN, rotation: [0, 1, 0] as [number, number, number] }

    expect(placementWithPivot(SCAN_ORIGIN, next, null)).toBe(next)
  })

  it('leaves a translation alone, so position keeps meaning the offset from the scan origin', () => {
    const next = { ...SCAN_ORIGIN, position: [5, 6, 7] as [number, number, number] }

    expect(placementWithPivot(SCAN_ORIGIN, next, NEAR_THE_POINTS)).toBe(next)
  })

  it('leaves an edit that changed nothing alone', () => {
    const next = { ...SCAN_ORIGIN }

    expect(placementWithPivot(SCAN_ORIGIN, next, NEAR_THE_POINTS)).toBe(next)
  })

  it('holds the chosen point still through a rotation', () => {
    const next = { ...SCAN_ORIGIN, rotation: [0, Math.PI / 4, 0] as [number, number, number] }

    const corrected = placementWithPivot(SCAN_ORIGIN, next, NEAR_THE_POINTS)
    const where = throughPlacement(corrected, NEAR_THE_POINTS)

    expect(where.distanceTo(NEAR_THE_POINTS)).toBeLessThan(1e-6)
  })

  it('holds it still through a scale change', () => {
    const next = { ...SCAN_ORIGIN, scale: 4 }

    const corrected = placementWithPivot(SCAN_ORIGIN, next, NEAR_THE_POINTS)
    const where = throughPlacement(corrected, NEAR_THE_POINTS)

    expect(where.distanceTo(NEAR_THE_POINTS)).toBeLessThan(1e-6)
  })

  it('holds it still through both at once', () => {
    const next = { ...SCAN_ORIGIN, rotation: [0.2, 0.4, 0.1] as [number, number, number], scale: 2.5 }

    const corrected = placementWithPivot(SCAN_ORIGIN, next, NEAR_THE_POINTS)
    const where = throughPlacement(corrected, NEAR_THE_POINTS)

    expect(where.distanceTo(NEAR_THE_POINTS)).toBeLessThan(1e-6)
  })

  it('holds it still when the cloud has already been moved and turned', () => {
    const current = {
      position: [120, -30, 45] as [number, number, number],
      rotation: [0.1, 0.9, -0.2] as [number, number, number],
      scale: 1.7,
      sourceUp: 'y' as const,
    }
    const pivot = throughPlacement(current, new THREE.Vector3(4, 5, 6))
    const next = { ...current, rotation: [0.3, 0.1, 0.5] as [number, number, number], scale: 0.8 }

    const corrected = placementWithPivot(current, next, pivot)

    expect(throughPlacement(corrected, new THREE.Vector3(4, 5, 6)).distanceTo(pivot)).toBeLessThan(1e-6)
  })

  it('still applies the rotation and scale the user asked for', () => {
    const next = { ...SCAN_ORIGIN, rotation: [0, Math.PI / 2, 0] as [number, number, number], scale: 3 }

    const corrected = placementWithPivot(SCAN_ORIGIN, next, NEAR_THE_POINTS)

    expect(corrected.rotation).toEqual(next.rotation)
    expect(corrected.scale).toBe(3)
  })

  it('is the plain placement when the pivot is the origin the cloud already turns about', () => {
    const next = { ...SCAN_ORIGIN, rotation: [0, Math.PI / 4, 0] as [number, number, number] }

    const corrected = placementWithPivot(SCAN_ORIGIN, next, new THREE.Vector3(0, 0, 0))

    expect(corrected.position.map(Math.round)).toEqual([0, 0, 0])
  })

  it('keeps a rotation about a far pivot from flinging the cloud away', () => {
    const oneDegree = { ...SCAN_ORIGIN, rotation: [0, Math.PI / 180, 0] as [number, number, number] }

    const uncorrected = throughPlacement(oneDegree, NEAR_THE_POINTS)
    const corrected = throughPlacement(
      placementWithPivot(SCAN_ORIGIN, oneDegree, NEAR_THE_POINTS),
      NEAR_THE_POINTS,
    )

    expect(uncorrected.distanceTo(NEAR_THE_POINTS)).toBeGreaterThan(1000)
    expect(corrected.distanceTo(NEAR_THE_POINTS)).toBeLessThan(1e-6)
  })
})

describe('placementFromPivotDrag', () => {
  const still = { position: NEAR_THE_POINTS.clone(), quaternion: new THREE.Quaternion(), scale: 1 }

  it('changes nothing when the gizmo has not been dragged', () => {
    const next = placementFromPivotDrag(SCAN_ORIGIN, NEAR_THE_POINTS, still)

    expect(next.position.map(Math.round)).toEqual([0, 0, 0])
    expect(next.scale).toBe(1)
  })

  it('turns the cloud about the pivot, which stays under the handles', () => {
    const drag = {
      ...still,
      quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 3, 0)),
    }

    const next = placementFromPivotDrag(SCAN_ORIGIN, NEAR_THE_POINTS, drag)

    expect(throughPlacement(next, NEAR_THE_POINTS).distanceTo(NEAR_THE_POINTS)).toBeLessThan(1e-6)
    expect(next.rotation[1]).toBeCloseTo(Math.PI / 3)
  })

  it('scales about the pivot', () => {
    const next = placementFromPivotDrag(SCAN_ORIGIN, NEAR_THE_POINTS, { ...still, scale: 3 })

    expect(throughPlacement(next, NEAR_THE_POINTS).distanceTo(NEAR_THE_POINTS)).toBeLessThan(1e-6)
    expect(next.scale).toBe(3)
  })

  it('still translates when the gizmo is dragged sideways', () => {
    const drag = { ...still, position: NEAR_THE_POINTS.clone().add(new THREE.Vector3(10, 0, 0)) }

    const next = placementFromPivotDrag(SCAN_ORIGIN, NEAR_THE_POINTS, drag)

    expect(next.position[0]).toBeCloseTo(10)
  })

  it('compounds onto a cloud that was already turned and scaled', () => {
    const base = {
      position: [12, -3, 4] as [number, number, number],
      rotation: [0, Math.PI / 6, 0] as [number, number, number],
      scale: 2,
      sourceUp: 'y' as const,
    }
    const pivot = throughPlacement(base, new THREE.Vector3(3, 1, 2))
    const drag = {
      position: pivot.clone(),
      quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 6, 0)),
      scale: 1.5,
    }

    const next = placementFromPivotDrag(base, pivot, drag)

    expect(throughPlacement(next, new THREE.Vector3(3, 1, 2)).distanceTo(pivot)).toBeLessThan(1e-6)
    expect(next.rotation[1]).toBeCloseTo(Math.PI / 3)
    expect(next.scale).toBeCloseTo(3)
  })
})
