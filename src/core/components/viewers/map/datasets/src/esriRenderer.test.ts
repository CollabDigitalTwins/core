// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { styleFromDrawingInfo } from './esriRenderer'

const fill = (color: number[]) => ({ color, outline: { color: [0, 0, 0, 255], width: 0.75 } })

describe('styleFromDrawingInfo', () => {
  it('turns a simple renderer into a flat colour with the publisher outline', () => {
    const result = styleFromDrawingInfo({ renderer: { type: 'simple', symbol: fill([255, 0, 0, 128]) } })
    expect(result?.layerColour).toBe('#ff0000')
    expect(result?.style).toMatchObject({ renderer: { kind: 'single' }, strokeColour: '#000000', strokeWidth: 1 })
    expect(result?.style.opacity).toBeCloseTo(128 / 255)
  })

  it('turns unique values into categories', () => {
    const result = styleFromDrawingInfo({
      renderer: { type: 'uniqueValue', field1: 'TYPE', uniqueValueInfos: [{ value: 'Tennis', symbol: fill([0, 255, 0, 255]) }] },
    })
    expect(result?.style.renderer).toEqual({ kind: 'categorical', field: 'TYPE', categories: [{ value: 'Tennis', colour: '#00ff00' }], otherColour: '#9ca3af' })
  })

  it('keeps a hollow category hollow without hiding the others', () => {
    const result = styleFromDrawingInfo({
      transparency: 0,
      renderer: { type: 'uniqueValue', field1: 'ECUMENE_EN', uniqueValueInfos: [
        { value: '1', symbol: fill([0, 0, 0, 0]) },
        { value: '0', symbol: fill([225, 225, 225, 255]) },
      ] },
    })
    expect(result?.style.opacity).toBe(1)
    expect(result?.style.renderer).toMatchObject({ categories: [{ value: '1', colour: '#000000', opacity: 0 }, { value: '0', colour: '#e1e1e1' }] })
  })

  it('turns class breaks into graduated thresholds', () => {
    const result = styleFromDrawingInfo({
      renderer: {
        type: 'classBreaks',
        field: 'POP',
        classBreakInfos: [{ classMaxValue: 10, symbol: fill([1, 1, 1, 255]) }, { classMaxValue: 20, symbol: fill([2, 2, 2, 255]) }],
      },
    })
    expect(result?.style.renderer).toMatchObject({ kind: 'graduated', field: 'POP', breaks: [10], colours: ['#010101', '#020202'] })
  })

  it('ignores missing or picture-only symbology', () => {
    expect(styleFromDrawingInfo(undefined)).toBeUndefined()
    expect(styleFromDrawingInfo({ renderer: { type: 'simple', symbol: {} } })).toBeUndefined()
  })
})
