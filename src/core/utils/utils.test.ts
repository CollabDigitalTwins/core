// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, it, expect } from 'vitest'

import { cn, getFileExtension, toDisplayString } from './utils'

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })
  it('drops falsy values (clsx)', () => {
    // via a variable so the `cond && class` idiom isn't constant-folded away
    const isActive: boolean = false
    expect(cn('a', isActive && 'b', null, undefined, 'c')).toBe('a c')
    expect(cn(['a', 'b'])).toBe('a b')
  })
  it('resolves conflicting Tailwind utilities (tailwind-merge keeps the last)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })
})

describe('getFileExtension', () => {
  const f = (name: string) => ({ name }) as File
  it('returns the lowercased extension', () => {
    expect(getFileExtension(f('photo.PNG'))).toBe('png')
    expect(getFileExtension(f('model.GLB'))).toBe('glb')
  })
  it('uses the last segment for multi-dot names', () => {
    expect(getFileExtension(f('archive.tar.gz'))).toBe('gz')
  })
  it('returns empty string when there is no extension', () => {
    expect(getFileExtension(f('README'))).toBe('')
  })
})

describe('toDisplayString', () => {
  it('passes primitives through', () => {
    expect(toDisplayString('abc')).toBe('abc')
    expect(toDisplayString(42)).toBe('42')
    expect(toDisplayString(false)).toBe('false')
  })
  it('renders nullish values as an empty string', () => {
    expect(toDisplayString(null)).toBe('')
    expect(toDisplayString(undefined)).toBe('')
  })
  it('serializes objects and arrays as JSON instead of [object Object]', () => {
    expect(toDisplayString({ a: 1 })).toBe('{"a":1}')
    expect(toDisplayString([1, 'b'])).toBe('[1,"b"]')
  })
  it('returns an empty string for circular structures', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(toDisplayString(circular)).toBe('')
  })
})
