// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { placementToast } from './placementToastMessage'

describe('placementToast', () => {
  it('names the action that was saved', () => {
    expect(placementToast('translate', true)).toEqual({ tone: 'success', key: 'movedFile' })
    expect(placementToast('rotate', true)).toEqual({ tone: 'success', key: 'rotatedFile' })
    expect(placementToast('scale', true)).toEqual({ tone: 'success', key: 'scaledFile' })
  })

  it('reports a failed write the same way whatever the action was', () => {
    for (const mode of ['translate', 'rotate', 'scale'] as const) {
      expect(placementToast(mode, false)).toEqual({ tone: 'error', key: 'saveFailed' })
    }
  })
})
