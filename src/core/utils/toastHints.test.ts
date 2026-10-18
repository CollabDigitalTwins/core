// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

import { dismissHint, newHintId, onHintClosed } from './toastHints'

const shown = new Set<string>()
vi.mock('sonner', () => ({ toast: { dismiss: vi.fn(), getToasts: () => [...shown].map(id => ({ id })) } }))

describe('toast hints', () => {
  it('runs the close handler when the person closes the hint', () => {
    const close = vi.fn()
    onHintClosed('draw', close)()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('stays quiet when the code dismisses the hint itself', () => {
    const close = vi.fn()
    const handler = onHintClosed('draw', close)
    shown.add('draw')
    dismissHint('draw')
    shown.delete('draw')
    handler()
    expect(close).not.toHaveBeenCalled()
    handler()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('does not swallow a later close when it dismissed a hint that was not showing', () => {
    const close = vi.fn()
    dismissHint('place')
    onHintClosed('place', close)()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('gives every run of a tool its own hint id, so a re-shown hint never revives one still closing', () => {
    expect(newHintId('draw')).not.toBe(newHintId('draw'))
    expect(newHintId('draw').startsWith('draw:')).toBe(true)
  })
})
