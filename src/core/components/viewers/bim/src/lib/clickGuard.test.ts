// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CLICK_MAX_MS, createClickGuard, type ClickGuard } from './clickGuard'

function pointer(type: string, x: number, y: number, timeStamp: number): PointerEvent {
  const event = new MouseEvent(type, { clientX: x, clientY: y }) as PointerEvent
  Object.defineProperty(event, 'timeStamp', { value: timeStamp })
  return event
}

describe('createClickGuard', () => {
  let canvas: HTMLElement
  let guard: ClickGuard

  beforeEach(() => {
    canvas = document.createElement('canvas')
    guard = createClickGuard(canvas)
  })

  afterEach(() => guard.dispose())

  it('accepts a quick press that stays put', () => {
    canvas.dispatchEvent(pointer('pointerdown', 10, 10, 0))
    expect(guard.isClick(pointer('click', 11, 11, 120))).toBe(true)
  })

  it('rejects a press that travelled and came back, as an orbit does', () => {
    canvas.dispatchEvent(pointer('pointerdown', 10, 10, 0))
    window.dispatchEvent(pointer('pointermove', 60, 10, 50))
    expect(guard.isClick(pointer('click', 10, 10, 120))).toBe(false)
  })

  it('rejects a press released far from where it started', () => {
    canvas.dispatchEvent(pointer('pointerdown', 10, 10, 0))
    expect(guard.isClick(pointer('click', 30, 10, 120))).toBe(false)
  })

  it('rejects a press held longer than a click', () => {
    canvas.dispatchEvent(pointer('pointerdown', 10, 10, 0))
    expect(guard.isClick(pointer('click', 10, 10, CLICK_MAX_MS + 1))).toBe(false)
  })

  it('rejects a click with no press on the canvas', () => {
    expect(guard.isClick(pointer('click', 10, 10, 0))).toBe(false)
  })

  it('counts each press once', () => {
    canvas.dispatchEvent(pointer('pointerdown', 10, 10, 0))
    expect(guard.isClick(pointer('click', 10, 10, 50))).toBe(true)
    expect(guard.isClick(pointer('click', 10, 10, 60))).toBe(false)
  })
})
