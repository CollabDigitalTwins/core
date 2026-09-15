// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { act, renderHook, waitFor } from '@testing-library/react'
import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@thatopen/components', () => ({}))
vi.mock('../CurrentWorld', () => ({ CurrentWorld: class CurrentWorld {} }))
vi.mock('../ModelManager', () => ({ ModelManager: class ModelManager {} }))
vi.mock('../SceneObjects', () => ({ BimSceneObjects: class BimSceneObjects {} }))
vi.mock('../lib/pickAtPointer', () => ({ pickAtPointer: vi.fn() }))

import { CurrentWorld } from '../CurrentWorld'
import { pickAtPointer } from '../lib/pickAtPointer'
import { BimSceneObjects } from '../SceneObjects'
import { SceneObjectRegistry } from '../SceneObjects/sceneObjectRegistry'

import { useViewportContextMenu } from './useViewportContextMenu'

import type { DbFile } from '../../../../../types/dbTypes'
import type * as OBC from '@thatopen/components'

const files = [
  { id: 4, name: 'site-plan.dxf', extension: 'dxf' },
  { id: 5, name: 'courtyard.spz', extension: 'spz' },
] as DbFile[]

function fakeControls() {
  const listeners = new Map<string, Set<() => void>>()
  const addEventListener = vi.fn((type: string, handler: () => void) => {
    const set = listeners.get(type) ?? new Set()
    set.add(handler)
    listeners.set(type, set)
  })
  const removeEventListener = vi.fn((type: string, handler: () => void) => {
    listeners.get(type)?.delete(handler)
  })
  const fire = (type: string) => { for (const handler of [...(listeners.get(type) ?? [])]) handler() }
  return { addEventListener, removeEventListener, fire }
}

function makeWorld(controls: ReturnType<typeof fakeControls> | null) {
  return {
    renderer: { three: { domElement: document.createElement('canvas') } },
    camera: { controls },
  }
}

function fakeComponents(world: unknown, registry: SceneObjectRegistry | null) {
  return {
    get: (Ctor: unknown) => {
      if (Ctor === CurrentWorld) return { world }
      if (Ctor === BimSceneObjects) return { registry }
      throw new Error('unexpected component lookup')
    },
  } as unknown as OBC.Components
}

function dxfRegistry(): SceneObjectRegistry {
  const registry = new SceneObjectRegistry({ scene: new THREE.Group() })
  registry.add({ key: '4', fileId: '4', kind: 'dxf', root: new THREE.Group() })
  return registry
}

function fireDom(target: EventTarget, type: string, props: Record<string, unknown> = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, props)
  target.dispatchEvent(event)
}

// Opens the menu on the dxf file (id 4), a stable 'object'-kind target unaffected by splatIds.
async function openDxfMenu(canvas: HTMLElement) {
  vi.mocked(pickAtPointer).mockResolvedValueOnce({
    fragment: null, object: { distance: 1, fileId: '4' }, splat: null, cloud: null,
  } as never)
  fireDom(canvas, 'pointerdown', { button: 2, clientX: 10, clientY: 10 })
  fireDom(window, 'pointerup', { button: 2, clientX: 10, clientY: 10 })
}

describe('useViewportContextMenu dismissal', () => {
  beforeEach(() => { vi.mocked(pickAtPointer).mockReset() })

  it('closes on Escape', async () => {
    const world = makeWorld(null)
    const components = fakeComponents(world, dxfRegistry())
    const { result } = renderHook(() => useViewportContextMenu(components, files, []))

    await openDxfMenu(world.renderer.three.domElement)
    await waitFor(() => expect(result.current.menu).not.toBeNull())

    act(() => { fireDom(window, 'keydown', { key: 'Escape' }) })

    expect(result.current.menu).toBeNull()
  })

  it('does nothing on a non-Escape key, proving the assertion above is not a tautology', async () => {
    const world = makeWorld(null)
    const components = fakeComponents(world, dxfRegistry())
    const { result } = renderHook(() => useViewportContextMenu(components, files, []))

    await openDxfMenu(world.renderer.three.domElement)
    await waitFor(() => expect(result.current.menu).not.toBeNull())

    act(() => { fireDom(window, 'keydown', { key: 'a' }) })

    expect(result.current.menu).not.toBeNull()
  })

  it('closes when the camera starts a control gesture', async () => {
    const controls = fakeControls()
    const world = makeWorld(controls)
    const components = fakeComponents(world, dxfRegistry())
    const { result } = renderHook(() => useViewportContextMenu(components, files, []))

    await openDxfMenu(world.renderer.three.domElement)
    await waitFor(() => expect(result.current.menu).not.toBeNull())

    act(() => { controls.fire('control') })

    expect(result.current.menu).toBeNull()
  })

  it('closes when the menu\'s file is removed from the files list', async () => {
    const world = makeWorld(null)
    const components = fakeComponents(world, dxfRegistry())
    const { result, rerender } = renderHook(
      (props: { files: DbFile[] }) => useViewportContextMenu(components, props.files, []),
      { initialProps: { files } },
    )

    await openDxfMenu(world.renderer.three.domElement)
    await waitFor(() => expect(result.current.menu).not.toBeNull())

    act(() => { rerender({ files: files.filter(file => file.id !== 4) }) })

    expect(result.current.menu).toBeNull()
  })

  it('leaves the menu open when an unrelated file is removed, proving the check above targets the right file', async () => {
    const world = makeWorld(null)
    const components = fakeComponents(world, dxfRegistry())
    const { result, rerender } = renderHook(
      (props: { files: DbFile[] }) => useViewportContextMenu(components, props.files, []),
      { initialProps: { files } },
    )

    await openDxfMenu(world.renderer.three.domElement)
    await waitFor(() => expect(result.current.menu).not.toBeNull())

    act(() => { rerender({ files: files.filter(file => file.id !== 5) }) })

    expect(result.current.menu).not.toBeNull()
  })

  it('closes a splat menu once its id drops out of splatIds', async () => {
    const world = makeWorld(null)
    const components = fakeComponents(world, null)
    const { result, rerender } = renderHook(
      (props: { splatIds: string[] }) => useViewportContextMenu(components, files, props.splatIds),
      { initialProps: { splatIds: ['5'] } },
    )

    vi.mocked(pickAtPointer).mockResolvedValueOnce({
      fragment: null, object: null, splat: { distance: 1, id: '5' }, cloud: null,
    } as never)
    fireDom(world.renderer.three.domElement, 'pointerdown', { button: 2, clientX: 10, clientY: 10 })
    fireDom(window, 'pointerup', { button: 2, clientX: 10, clientY: 10 })
    await waitFor(() => expect(result.current.menu).not.toBeNull())

    act(() => { rerender({ splatIds: [] }) })

    expect(result.current.menu).toBeNull()
  })

  it('closes an object menu once the scene registry marks it hidden', async () => {
    const registry = dxfRegistry()
    const world = makeWorld(null)
    const components = fakeComponents(world, registry)
    const { result } = renderHook(() => useViewportContextMenu(components, files, []))

    await openDxfMenu(world.renderer.three.domElement)
    await waitFor(() => expect(result.current.menu).not.toBeNull())

    registry.setVisible('4', false)

    await waitFor(() => expect(result.current.menu).toBeNull(), { timeout: 1000 })
  })

  it('removes the Escape and camera listeners once the menu closes', async () => {
    const controls = fakeControls()
    const world = makeWorld(controls)
    const components = fakeComponents(world, dxfRegistry())
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { result } = renderHook(() => useViewportContextMenu(components, files, []))

    await openDxfMenu(world.renderer.three.domElement)
    await waitFor(() => expect(result.current.menu).not.toBeNull())

    const controlCall = controls.addEventListener.mock.calls.find(([type]) => type === 'control')
    expect(controlCall).toBeDefined()
    const controlHandler = controlCall?.[1]

    act(() => { result.current.close() })

    expect(controls.removeEventListener).toHaveBeenCalledWith('control', controlHandler)
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

    removeSpy.mockRestore()
  })

  it('does not leave a keydown listener bound before any menu has ever opened', () => {
    const world = makeWorld(null)
    const components = fakeComponents(world, dxfRegistry())
    const addSpy = vi.spyOn(window, 'addEventListener')

    renderHook(() => useViewportContextMenu(components, files, []))

    expect(addSpy).not.toHaveBeenCalledWith('keydown', expect.any(Function))

    addSpy.mockRestore()
  })
})
