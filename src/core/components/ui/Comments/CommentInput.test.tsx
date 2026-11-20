// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createCommentMock, map } = vi.hoisted(() => {
  const listeners = new Map<string, Set<(e: unknown) => void>>()
  return {
    createCommentMock: vi.fn(),
    map: {
      listeners,
      on: (type: string, fn: (e: unknown) => void) => { listeners.set(type, (listeners.get(type) ?? new Set()).add(fn)) },
      off: (type: string, fn: (e: unknown) => void) => { listeners.get(type)?.delete(fn) },
      fire: (type: string, e: unknown) => listeners.get(type)?.forEach(fn => fn(e)),
      getCanvas: () => ({ style: { cursor: '' } }),
      queryTerrainElevation: () => 0,
    },
  }
})

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: '7', organizationId: 3 } } }) }))
vi.mock('sonner', () => ({ toast: vi.fn() }))
vi.mock('../../../hooks/comments/comments', () => ({ useCreateComment: () => ({ createComment: createCommentMock }) }))
vi.mock('../../../store', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  return {
    AppConfigContext: React.createContext({ state: {} }),
    MapContext: React.createContext({ state: { map: { map } } }),
    BuildingsContext: React.createContext({ state: { buildings: { building: null } } }),
    MenusContext: React.createContext({ state: { menus: { commentsVisibleInViewer: ['map'] } }, dispatch: vi.fn() }),
    ToolsContext: React.createContext({ state: { tools: { currentToolId: 'map-add-comment' } } }),
  }
})

import { ViewerNames } from '../../../types/dbTypes'

import { CommentInput } from './CommentInput'

const dblclick = () => act(() => map.fire('dblclick', { lngLat: { lng: -75.7, lat: 45.4 } }))

function startPlacing() {
  const view = render(<CommentInput viewer={ViewerNames.map} layout="dialog" isOpen />)
  fireEvent.change(screen.getByPlaceholderText('placeholder'), { target: { value: 'Hello' } })
  fireEvent.click(document.querySelector('[data-tour="comment-submit"]')!)
  return view
}

beforeEach(() => {
  createCommentMock.mockReset()
  createCommentMock.mockResolvedValue({})
  map.listeners.clear()
})

describe('CommentInput placing on the map', () => {
  it('creates the comment where the map is double-clicked while placing', () => {
    startPlacing()
    dblclick()
    expect(createCommentMock).toHaveBeenCalledWith({ commentData: expect.objectContaining({ text: 'Hello', longitude: -75.7, latitude: 45.4 }) })
  })

  it('stops placing once the dialog is closed', () => {
    const { rerender } = startPlacing()
    rerender(<CommentInput viewer={ViewerNames.map} layout="dialog" isOpen={false} />)
    dblclick()
    expect(createCommentMock).not.toHaveBeenCalled()
  })
})
