// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BimContext } from '../../../../../store/BIM/context'

import { useBimPointClouds } from './useBimPointClouds'

const { component } = vi.hoisted(() => {
  const handlers = new Set<() => void>()
  const loaded: Array<{ id: string }> = []
  return {
    component: {
      loaded,
      list: () => [...loaded],
      onChanged: {
        add: (fn: () => void) => handlers.add(fn),
        remove: (fn: () => void) => handlers.delete(fn),
      },
      publish: () => { for (const fn of [...handlers]) fn() },
      handlers,
    },
  }
})

vi.mock('./index', () => ({ BimPointClouds: class {} }))

function Probe() {
  const clouds = useBimPointClouds()
  return <span data-testid="ids">{clouds.map((cloud) => cloud.id).join(',')}</span>
}

function renderProbe(bimComponents: unknown) {
  render(
    <BimContext.Provider value={{ state: { bim: { bimComponents } }, dispatch: vi.fn() } as never}>
      <Probe />
    </BimContext.Provider>,
  )
}

afterEach(() => {
  component.loaded.length = 0
  component.handlers.clear()
})

describe('useBimPointClouds', () => {
  it('publishes what the component already holds on mount', () => {
    component.loaded.push({ id: '669' })
    renderProbe({ get: () => component })
    expect(screen.getByTestId('ids')).toHaveTextContent('669')
  })

  it('re-reads the component when it announces a change', () => {
    renderProbe({ get: () => component })
    expect(screen.getByTestId('ids')).toBeEmptyDOMElement()

    act(() => {
      component.loaded.push({ id: '670' })
      component.publish()
    })

    expect(screen.getByTestId('ids')).toHaveTextContent('670')
  })

  it('is empty with no components and subscribes to nothing', () => {
    renderProbe(null)
    expect(screen.getByTestId('ids')).toBeEmptyDOMElement()
    expect(component.handlers.size).toBe(0)
  })
})
