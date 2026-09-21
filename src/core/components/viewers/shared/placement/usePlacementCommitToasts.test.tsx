// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) => `${key}:${values?.name ?? ''}`,
}))

const toasts: { tone: string, message: string }[] = []
vi.mock('sonner', () => ({
  toast: {
    success: (message: string) => toasts.push({ tone: 'success', message }),
    error: (message: string) => toasts.push({ tone: 'error', message }),
  },
}))

import { createPlacementEvent } from './placementEvent'
import { usePlacementCommitToasts } from './usePlacementCommitToasts'

import type { PlacementState } from './placementCore'

const commit = (over: Partial<PlacementState> = {}) =>
  ({ name: 'tower.glb', mode: 'translate', ...over }) as PlacementState

describe('usePlacementCommitToasts', () => {
  it('names what the finished edit did to the file', () => {
    toasts.length = 0
    const onCommitted = createPlacementEvent<PlacementState>()
    renderHook(() => usePlacementCommitToasts(onCommitted))

    onCommitted.trigger(commit({ mode: 'rotate' }))

    expect(toasts).toEqual([{ tone: 'success', message: 'rotatedFile:tower.glb' }])
  })

  it('reports a write that never landed as a failure', () => {
    toasts.length = 0
    const onCommitted = createPlacementEvent<PlacementState>()
    renderHook(() => usePlacementCommitToasts(onCommitted))

    onCommitted.trigger(commit({ mode: 'scale', ok: false }))

    expect(toasts).toEqual([{ tone: 'error', message: 'saveFailed:tower.glb' }])
  })

  it('stops reporting once unmounted', () => {
    toasts.length = 0
    const onCommitted = createPlacementEvent<PlacementState>()
    const { unmount } = renderHook(() => usePlacementCommitToasts(onCommitted))

    unmount()
    onCommitted.trigger(commit())

    expect(toasts).toEqual([])
  })
})
