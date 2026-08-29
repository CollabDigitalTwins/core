// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BimContext } from '../../../../../store/BIM/context'
import { DEFAULT_PLACEMENT } from '../../../shared/pointcloud/pointCloudPlacement'

import { useBimPointCloudAlignment } from './useBimPointCloudAlignment'

import type { AlignmentState } from './PointCloudAlignment'

const { component } = vi.hoisted(() => {
  const handlers = new Set<(next: unknown) => void>()
  return {
    component: {
      activeId: null as string | null,
      current: null as unknown,
      placement: () => component.current,
      onChanged: {
        add: (fn: (next: unknown) => void) => handlers.add(fn),
        remove: (fn: (next: unknown) => void) => handlers.delete(fn),
      },
      publish: (next: unknown) => { for (const fn of [...handlers]) fn(next) },
      handlers,
    },
  }
})

vi.mock('./PointCloudAlignment', () => ({ PointCloudAlignment: class {} }))

function Probe() {
  const session = useBimPointCloudAlignment()
  return <span data-testid="session">{session ? `${session.id}:${session.placement.position.join('/')}` : 'none'}</span>
}

function renderProbe(bimComponents: unknown) {
  return render(
    <BimContext.Provider value={{ state: { bim: { bimComponents } }, dispatch: vi.fn() } as never}>
      <Probe />
    </BimContext.Provider>,
  )
}

afterEach(() => {
  component.activeId = null
  component.current = null
  component.handlers.clear()
})

describe('useBimPointCloudAlignment', () => {
  it('reads a session that was already running when it mounted', () => {
    component.activeId = '669'
    component.current = { ...DEFAULT_PLACEMENT, position: [1, 2, 3] }

    renderProbe({ get: () => component })

    expect(screen.getByTestId('session')).toHaveTextContent('669:1/2/3')
  })

  it('reports no session without a components container', () => {
    renderProbe(null)
    expect(screen.getByTestId('session')).toHaveTextContent('none')
  })

  it('follows the component as the placement changes', () => {
    renderProbe({ get: () => component })

    act(() => {
      component.publish({ id: '669', placement: { ...DEFAULT_PLACEMENT, position: [4, 0, 0] } } as AlignmentState)
    })

    expect(screen.getByTestId('session')).toHaveTextContent('669:4/0/0')
  })

  it('clears when the session ends', () => {
    renderProbe({ get: () => component })
    act(() => { component.publish({ id: '669', placement: DEFAULT_PLACEMENT } as AlignmentState) })

    act(() => { component.publish(null) })

    expect(screen.getByTestId('session')).toHaveTextContent('none')
  })

  it('unsubscribes on unmount', () => {
    const { unmount } = renderProbe({ get: () => component })
    expect(component.handlers.size).toBe(1)

    unmount()

    expect(component.handlers.size).toBe(0)
  })
})
