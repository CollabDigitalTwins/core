// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'
import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../FitCamera', () => ({ FitCamera: class {} }))
vi.mock('../Splats', () => ({ BimSplats: class {} }))
vi.mock('../SceneObjects', () => ({ BimSceneObjects: class {} }))

import { BimContext } from '../../../../../store/BIM/context'

import { FitCamera } from '../FitCamera'
import { BimSceneObjects } from '../SceneObjects'
import { BimSplats } from '../Splats'

import { FitCameraTool } from './FitCameraTool'

import type { Tool } from '../../../../../types/tools'

const tool = { id: null, title: 'Fit', icon: () => null } as unknown as Tool

interface RenderToolOptions {
  sceneSelection?: { kind: 'object' | 'splat', fileId: string } | null
  selection?: Record<string, Set<number>>
  boundsOf?: (id: string) => THREE.Box3 | null
  root?: THREE.Object3D
  frameBox?: (box: THREE.Box3, animated?: boolean) => Promise<void>
  fitToSelection?: (objects: THREE.Object3D[]) => Promise<void>
  fitToItems?: (items: Record<string, Set<number>>) => Promise<boolean>
  fit?: () => Promise<void>
}

function renderTool(options: RenderToolOptions) {
  const fitCamera = {
    frameBox: options.frameBox ?? vi.fn(async () => {}),
    fitToSelection: options.fitToSelection ?? vi.fn(async () => {}),
    fitToItems: options.fitToItems ?? vi.fn(async () => false),
    fit: options.fit ?? vi.fn(async () => {}),
  }
  const splats = { boundsOf: options.boundsOf ?? (() => null) }
  const sceneObjects = { registry: { get: () => (options.root ? { root: options.root } : undefined) } }

  const bimComponents = {
    get: (Ctor: unknown) => {
      if (Ctor === FitCamera) return fitCamera
      if (Ctor === BimSplats) return splats
      if (Ctor === BimSceneObjects) return sceneObjects
      throw new Error('unexpected component lookup')
    },
  }

  const state = {
    bim: {
      bimComponents,
      selection: options.selection ?? {},
      sceneSelection: options.sceneSelection ?? null,
    },
  }

  render(
    <BimContext.Provider value={{ state, dispatch: vi.fn() } as never}>
      <FitCameraTool tool={tool} />
    </BimContext.Provider>,
  )

  return fitCamera
}

describe('FitCameraTool', () => {
  it('frames a selected splat by its own bounds', async () => {
    const frameBox = vi.fn(async () => {})
    const box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 2, 2))
    renderTool({ sceneSelection: { kind: 'splat', fileId: '41' }, boundsOf: () => box, frameBox })

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => { expect(frameBox).toHaveBeenCalledWith(box, true) })
  })

  it('frames a selected object by its scene root', async () => {
    const fitToSelection = vi.fn(async () => {})
    const root = new THREE.Group()
    renderTool({ sceneSelection: { kind: 'object', fileId: '41' }, root, fitToSelection })

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => { expect(fitToSelection).toHaveBeenCalledWith([root]) })
  })

  it('falls back to the whole scene when the splat has no bounds yet', async () => {
    const fit = vi.fn(async () => {})
    const frameBox = vi.fn(async () => {})
    const fitToSelection = vi.fn(async () => {})
    renderTool({ sceneSelection: { kind: 'splat', fileId: '41' }, boundsOf: () => null, fit, frameBox, fitToSelection })

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => { expect(fit).toHaveBeenCalled() })
    expect(frameBox).not.toHaveBeenCalled()
    expect(fitToSelection).not.toHaveBeenCalled()
  })

  it('still frames a BIM element selection', async () => {
    const fitToItems = vi.fn(async () => true)
    const fit = vi.fn(async () => {})
    renderTool({ selection: { 'a.frag': new Set([3]) }, fitToItems, fit })

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => { expect(fitToItems).toHaveBeenCalled() })
    expect(fit).not.toHaveBeenCalled()
  })
})
