// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { resolveBounds } from './validateBounds'

const FALLBACK: [number, number, number, number] = [-180, -85, 180, 85]

describe('resolveBounds', () => {
  it('returns a valid flat bounds array as-is', () => {
    const flat = [-75, 45, -74, 46] as [number, number, number, number]
    expect(resolveBounds(flat, FALLBACK)).toBe(flat)
  })

  it('returns a valid nested bounds array as-is', () => {
    const nested = [[-75, 45], [-74, 46]] as [[number, number], [number, number]]
    expect(resolveBounds(nested, FALLBACK)).toBe(nested)
  })

  it('parses a JSON-encoded flat bounds string', () => {
    expect(resolveBounds('[-75, 45, -74, 46]', FALLBACK)).toEqual([-75, 45, -74, 46])
  })

  it('parses a JSON-encoded nested bounds string', () => {
    expect(resolveBounds('[[-75, 45], [-74, 46]]', FALLBACK)).toEqual([[-75, 45], [-74, 46]])
  })

  it('falls back when the input has Infinity or NaN', () => {
    expect(resolveBounds([Infinity, 0, 0, 0], FALLBACK)).toBe(FALLBACK)
    expect(resolveBounds([NaN, 0, 0, 0], FALLBACK)).toBe(FALLBACK)
  })

  it('falls back when the array has the wrong length', () => {
    expect(resolveBounds([1, 2, 3], FALLBACK)).toBe(FALLBACK)
    expect(resolveBounds([1, 2, 3, 4, 5], FALLBACK)).toBe(FALLBACK)
  })

  it('falls back when nested array has wrong shape', () => {
    expect(resolveBounds([[1, 2, 3], [4, 5]], FALLBACK)).toBe(FALLBACK)
  })

  it('falls back for empty or whitespace-only strings', () => {
    expect(resolveBounds('', FALLBACK)).toBe(FALLBACK)
    expect(resolveBounds('   ', FALLBACK)).toBe(FALLBACK)
  })

  it('falls back for malformed JSON', () => {
    expect(resolveBounds('{not json', FALLBACK)).toBe(FALLBACK)
  })

  it('falls back for null and undefined', () => {
    expect(resolveBounds(null, FALLBACK)).toBe(FALLBACK)
    expect(resolveBounds(undefined, FALLBACK)).toBe(FALLBACK)
  })
})
