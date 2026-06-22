// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { buildComment } from './commentUtils'

const base = {
  authorId: 7,
  organizationId: 3,
  image: null,
  text: 'hello',
  longitude: 1,
  latitude: 2,
  elevation: 3,
  x: 4,
  y: 5,
  z: 6,
  viewer: 'map',
  buildingId: 42,
} as const

describe('buildComment', () => {
  it('returns a comment shape with visible=true by default', () => {
    const c = buildComment({ ...base, now: new Date('2025-01-01T00:00:00Z') })
    expect(c.visible).toBe(true)
    expect(c.authorId).toBe(7)
    expect(c.organizationId).toBe(3)
    expect(c.text).toBe('hello')
    expect(c.buildingId).toBe(42)
    expect(c.viewer).toBe('map')
  })

  it('passes through positional fields exactly', () => {
    const c = buildComment({ ...base })
    expect(c.longitude).toBe(1)
    expect(c.latitude).toBe(2)
    expect(c.elevation).toBe(3)
    expect(c.x).toBe(4)
    expect(c.y).toBe(5)
    expect(c.z).toBe(6)
  })

  it('does not include id/createdAt/updatedAt in the result', () => {
    const c = buildComment({ ...base })
    expect(c.id).toBeUndefined()
    expect(c.createdAt).toBeUndefined()
    expect(c.updatedAt).toBeUndefined()
  })
})
