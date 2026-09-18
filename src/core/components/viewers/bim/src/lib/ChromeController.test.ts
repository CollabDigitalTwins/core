// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

import { BimPointClouds } from '../PointClouds'
import { BimSceneObjects } from '../SceneObjects'
import { BimSplats } from '../Splats'

import { ChromeController } from './ChromeController'

import type * as OBC from '@thatopen/components'

vi.mock('../CurrentWorld', () => ({ CurrentWorld: class CurrentWorld {} }))
vi.mock('../Highlighter', () => ({ Highlighter: class Highlighter {} }))
vi.mock('../PointClouds', () => ({ BimPointClouds: class BimPointClouds {} }))
vi.mock('../SceneObjects', () => ({ BimSceneObjects: class BimSceneObjects {} }))
vi.mock('../Splats', () => ({ BimSplats: class BimSplats {} }))
vi.mock('../ViewportGizmo', () => ({ ViewportGizmo: class ViewportGizmo {} }))

function sceneWith() {
  const pointCloud = { root: { visible: true } }
  const splat = { root: { visible: true } }
  const sceneObject = { root: { visible: true } }
  const fragmentModel = { object: { visible: true } }

  const registry = { list: () => [sceneObject] }
  const components = {
    get: (ctor: unknown) => {
      if (ctor === BimPointClouds) return { list: () => [pointCloud] }
      if (ctor === BimSplats) return { list: () => [splat] }
      if (ctor === BimSceneObjects) return { registry }
      return { core: { models: { list: new Map([['m1', fragmentModel]]) } } }
    },
  } as unknown as OBC.Components

  return { components, pointCloud, splat, sceneObject, fragmentModel }
}

describe('ChromeController.hideSceneContent', () => {
  it('hides point clouds, splats and scene objects', () => {
    const { components, pointCloud, splat, sceneObject } = sceneWith()

    new ChromeController(components).hideSceneContent()

    expect(pointCloud.root.visible).toBe(false)
    expect(splat.root.visible).toBe(false)
    expect(sceneObject.root.visible).toBe(false)
  })

  it('leaves the fragment models visible — they are the drawing fill', () => {
    const { components, fragmentModel } = sceneWith()

    new ChromeController(components).hideSceneContent()

    expect(fragmentModel.object.visible).toBe(true)
  })

  it('restores exactly what it hid', () => {
    const { components, pointCloud, splat, sceneObject } = sceneWith()
    const chrome = new ChromeController(components)

    chrome.hideSceneContent()
    chrome.restoreSceneContent()

    expect(pointCloud.root.visible).toBe(true)
    expect(splat.root.visible).toBe(true)
    expect(sceneObject.root.visible).toBe(true)
  })
})
