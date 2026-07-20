// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, it, expect } from 'vitest'

import { ToolsReducer, type ToolsState } from './reducer'

const base = { currentToolId: null } as unknown as ToolsState

describe('ToolsReducer', () => {
  it('SET-TOOL sets currentToolId (new object)', () => {
    const next = ToolsReducer(base, { type: 'SET-TOOL', payload: { currentToolId: 'measure' } } as never)
    expect(next.currentToolId).toBe('measure')
    expect(next).not.toBe(base)
  })
  it('CLEAR-TOOLS resets currentToolId to null', () => {
    const next = ToolsReducer({ currentToolId: 'measure' } as unknown as ToolsState, { type: 'CLEAR-TOOLS' } as never)
    expect(next.currentToolId).toBeNull()
  })
  it('returns the same state for an unknown action', () => {
    expect(ToolsReducer(base, { type: 'NOPE' } as never)).toBe(base)
  })
})
