// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { isBlank, parseBooleanValue, parseNumericValue } from './valueParsing'

describe('parseNumericValue', () => {
  it('reads numbers and formatted numeric strings', () => {
    expect(parseNumericValue(4.5)).toBe(4.5)
    expect(parseNumericValue('$1,200.50')).toBe(1200.5)
    expect(parseNumericValue('45 %')).toBe(45)
    expect(parseNumericValue('-3e2')).toBe(-300)
  })

  it('rejects text that merely starts with a number', () => {
    expect(parseNumericValue('12 Main St')).toBeNull()
    expect(parseNumericValue('')).toBeNull()
    expect(parseNumericValue(Number.NaN)).toBeNull()
    expect(parseNumericValue(null)).toBeNull()
  })
})

describe('parseBooleanValue', () => {
  it('reads booleans, 0/1 and yes/no words in three languages', () => {
    expect(parseBooleanValue(true)).toBe(true)
    expect(parseBooleanValue(0)).toBe(false)
    expect(parseBooleanValue(' Yes ')).toBe(true)
    expect(parseBooleanValue('non')).toBe(false)
    expect(parseBooleanValue('sí')).toBe(true)
  })

  it('returns null for anything else', () => {
    expect(parseBooleanValue('maybe')).toBeNull()
    expect(parseBooleanValue(2)).toBeNull()
  })
})

describe('isBlank', () => {
  it('treats null, undefined and whitespace as blank but keeps zero and false', () => {
    expect([null, undefined, '  '].every(isBlank)).toBe(true)
    expect([0, false, 'a'].some(isBlank)).toBe(false)
  })
})
