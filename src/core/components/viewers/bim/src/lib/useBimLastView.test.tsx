// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BimContext, BuildingsContext } from '../../../../../store'
import { readLastView } from '../../../shared/lastView/lastViewStore'

import { useBimLastView } from './useBimLastView'

vi.mock('../../../shared/lastView/useLastViewScope', () => ({ useLastViewScope: () => 'east:1' }))

interface Scene { models?: number; buildingId?: number }

type Point = { set: (x: number, y: number, z: number) => unknown }

function scene({ models = 1, buildingId = 7 }: Scene = {}) {
  const handlers = new Map<string, () => void>()
  const controls = {
    addEventListener: (type: string, handler: () => void) => handlers.set(type, handler),
    removeEventListener: (type: string) => handlers.delete(type),
    getPosition: (out: Point) => out.set(10.12345, 20, 30),
    getTarget: (out: Point) => out.set(1, 2, 3),
  }
  const bim = { world: { camera: { controls } }, fragments: { core: { models: { list: { size: models } } } } }
  const bimValue = { state: { bim }, dispatch: vi.fn() } as never
  const buildingsValue = { state: { buildings: { building: { id: buildingId } } }, dispatch: vi.fn() } as never
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BimContext.Provider value={bimValue}>
      <BuildingsContext.Provider value={buildingsValue}>{children}</BuildingsContext.Provider>
    </BimContext.Provider>
  )
  const fire = (type: string) => handlers.get(type)?.()
  return { wrapper, fire, handlers }
}

const savedParams = () => new URLSearchParams(readLastView('east:1')?.url.split('?')[1])

describe('useBimLastView', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/east?viewer=bim&buildingId=7')
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('remembers where the camera rests after the user moves it', () => {
    const { wrapper, fire } = scene()
    renderHook(() => useBimLastView(), { wrapper })

    fire('controlstart')
    fire('rest')

    expect(readLastView('east:1')?.viewer).toBe('bim')
    expect(savedParams().get('camX')).toBe('10.123')
    expect(savedParams().get('tarZ')).toBe('3.000')
    expect(savedParams().get('buildingId')).toBe('7')
  })

  it('ignores a rest the user did not cause, such as the load-time fit', () => {
    const { wrapper, fire } = scene()
    renderHook(() => useBimLastView(), { wrapper })

    fire('rest')

    expect(readLastView('east:1')).toBeNull()
  })

  it.each<[string, Scene]>([
    ['no model is loaded', { models: 0 }],
    ['the URL names another building', { buildingId: 8 }],
  ])('saves nothing while %s', (_, options) => {
    const { wrapper, fire } = scene(options)
    renderHook(() => useBimLastView(), { wrapper })

    fire('controlstart')
    fire('rest')

    expect(readLastView('east:1')).toBeNull()
  })

  it('stops listening once unmounted', () => {
    const { wrapper, handlers } = scene()
    const { unmount } = renderHook(() => useBimLastView(), { wrapper })

    unmount()

    expect(handlers.size).toBe(0)
  })
})
