// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { planeToEntry } from './planeToEntry'

const box = () =>
  new THREE.Box3(new THREE.Vector3(-5, 0, -10), new THREE.Vector3(5, 8, 10))

const plane = (normal: THREE.Vector3, point: THREE.Vector3) => ({
  key: 'plane-3',
  normal,
  point,
})

describe('planeToEntry', () => {
  it('takes its view direction from the plane normal', () => {
    const entry = planeToEntry(
      plane(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 4)),
      'model-a',
      box(),
      'Section 1',
    )
    expect(entry.viewDirection.x).toBeCloseTo(0)
    expect(entry.viewDirection.y).toBeCloseTo(0)
    expect(entry.viewDirection.z).toBeCloseTo(-1)
  })

  it('normalises a non-unit normal', () => {
    const entry = planeToEntry(
      plane(new THREE.Vector3(0, 0, -4), new THREE.Vector3(0, 0, 4)),
      'model-a',
      box(),
      'Section 1',
    )
    expect(entry.viewDirection.length()).toBeCloseTo(1)
  })

  it('sits the drawing position on the plane', () => {
    const point = new THREE.Vector3(1, 2, 4)
    const entry = planeToEntry(
      plane(new THREE.Vector3(0, 0, -1), point),
      'model-a',
      box(),
      'Section 1',
    )
    expect(entry.position.equals(point)).toBe(true)
    expect(entry.position).not.toBe(point)
  })

  it('frames the whole model box in the viewport', () => {
    const entry = planeToEntry(
      plane(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 4)),
      'model-a',
      box(),
      'Section 1',
    )
    expect(entry.viewport.right).toBeGreaterThanOrEqual(5)
    expect(entry.viewport.left).toBeLessThanOrEqual(-5)
    expect(entry.viewport.top).toBeGreaterThanOrEqual(8)
    expect(entry.viewport.bottom).toBeLessThanOrEqual(0)
  })

  it('reaches past the far side of the model along the view direction', () => {
    const entry = planeToEntry(
      plane(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 4)),
      'model-a',
      box(),
      'Section 1',
    )
    expect(entry.far).toBeGreaterThan(14)
  })

  it('stays positive when the model sits entirely behind the plane', () => {
    const entry = planeToEntry(
      plane(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 40)),
      'model-a',
      box(),
      'Section 1',
    )
    expect(entry.far).toBeGreaterThan(0)
  })

  it('frames the model for a horizontal cut, where world up is unusable', () => {
    const entry = planeToEntry(
      plane(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 6, 0)),
      'model-a',
      box(),
      'Level cut',
    )
    expect(Number.isFinite(entry.viewport.left)).toBe(true)
    expect(entry.viewport.right - entry.viewport.left).toBeGreaterThanOrEqual(10)
    expect(entry.viewport.top - entry.viewport.bottom).toBeGreaterThanOrEqual(10)
  })

  it('carries the plane key and the label, and starts unprojected', () => {
    const entry = planeToEntry(
      plane(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 4)),
      'model-a',
      box(),
      'Section 1',
    )
    expect(entry.planeKey).toBe('plane-3')
    expect(entry.label).toBe('Section 1')
    expect(entry.id).toContain('plane-3')
    expect(entry.modelId).toBe('model-a')
    expect(entry.drawing).toBeNull()
    expect(entry.projected).toBe(false)
    expect(entry.layers).toEqual([])
  })

  it('keeps direction on the cardinal union so the sidebar can still translate it', () => {
    const entry = planeToEntry(
      plane(new THREE.Vector3(0.9, 0, -0.1), new THREE.Vector3(0, 0, 0)),
      'model-a',
      box(),
      'Section 1',
    )
    expect(entry.direction).toBe('west')
  })

  it('copies the model box rather than aliasing it', () => {
    const source = box()
    const entry = planeToEntry(
      plane(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 4)),
      'model-a',
      source,
      'Section 1',
    )
    expect(entry.modelBox).not.toBe(source)
    expect(entry.modelBox.equals(source)).toBe(true)
  })
})
