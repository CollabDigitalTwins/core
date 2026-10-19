// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { keepOpenOnToast } from './keepOpenOnToast'

const outsideEventOn = (target: Element) => {
  const event = new CustomEvent('dismissableLayer.pointerDownOutside', { cancelable: true })
  target.addEventListener(event.type, () => {}, { once: true })
  target.dispatchEvent(event)
  return event
}

describe('keepOpenOnToast', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('cancels an outside interaction that lands on a toast', () => {
    document.body.innerHTML = '<ol data-sonner-toaster><li><button id="close"></button></li></ol>'
    const event = outsideEventOn(document.getElementById('close')!)

    keepOpenOnToast()(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('leaves an outside interaction elsewhere alone and still calls the caller handler', () => {
    document.body.innerHTML = '<div id="map"></div>'
    const event = outsideEventOn(document.getElementById('map')!)
    const onInteractOutside = vi.fn()

    keepOpenOnToast(onInteractOutside)(event)

    expect(event.defaultPrevented).toBe(false)
    expect(onInteractOutside).toHaveBeenCalledWith(event)
  })
})
