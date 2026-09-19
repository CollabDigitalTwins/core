// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { FULL_PLACEMENT, YAW_ONLY_PLACEMENT } from './placementTarget'
import { resolveViewportTarget } from './resolveViewportTarget'

import type { DbFile } from '../../../../../types/dbTypes'

const files = [
  { id: 1, name: 'tower.frag', extension: 'frag' },
  { id: 2, name: 'basement.laz', extension: 'laz' },
  { id: 3, name: 'panel.glb', extension: 'glb' },
  { id: 4, name: 'site-plan.dxf', extension: 'dxf' },
  { id: 5, name: 'courtyard.spz', extension: 'spz' },
] as DbFile[]

const near = { point: new THREE.Vector3(0, 0, 1), distance: 1 }
const far = { point: new THREE.Vector3(0, 0, 9), distance: 9 }

describe('resolveViewportTarget', () => {
  it('finds nothing when no source hit', () => {
    expect(resolveViewportTarget({ files, fragment: null, cloud: null, splat: null, object: null })).toBeNull()
  })

  it('resolves a fragment hit to its file by model name', () => {
    const hit = { ...near, modelId: 'tower.frag' }

    const resolved = resolveViewportTarget({ files, fragment: hit, cloud: null, splat: null, object: null })

    expect(resolved?.file.id).toBe(1)
    expect(resolved?.kind).toBe('model')
  })

  it('gives a BIM model yaw-only capabilities, so scale is never offered', () => {
    const hit = { ...near, modelId: 'tower.frag' }

    expect(resolveViewportTarget({ files, fragment: hit, cloud: null, splat: null, object: null })?.capabilities)
      .toEqual(YAW_ONLY_PLACEMENT)
  })

  it('resolves a cloud hit to its file by id', () => {
    const resolved = resolveViewportTarget({ files, fragment: null, cloud: { ...near, id: '2' }, splat: null, object: null })

    expect(resolved?.file.id).toBe(2)
    expect(resolved?.kind).toBe('cloud')
  })

  it('gives a point cloud full capabilities, so scale is offered', () => {
    const resolved = resolveViewportTarget({ files, fragment: null, cloud: { ...near, id: '2' }, splat: null, object: null })

    expect(resolved?.capabilities).toEqual(FULL_PLACEMENT)
  })

  it('takes the nearer hit when both sources hit', () => {
    const resolved = resolveViewportTarget({
      files,
      fragment: { ...far, modelId: 'tower.frag' },
      cloud: { ...near, id: '2' },
      splat: null,
      object: null,
    })

    expect(resolved?.kind).toBe('cloud')
  })

  it('lets the fragment win a tie, because it draws a snap marker', () => {
    const resolved = resolveViewportTarget({
      files,
      fragment: { ...near, modelId: 'tower.frag' },
      cloud: { ...near, id: '2' },
      splat: null,
      object: null,
    })

    expect(resolved?.kind).toBe('model')
  })

  it('finds nothing when the hit belongs to no known file', () => {
    const hit = { ...near, modelId: 'stranger.frag' }

    expect(resolveViewportTarget({ files, fragment: hit, cloud: null, splat: null, object: null })).toBeNull()
  })

  it('finds nothing when a cloud id matches no file', () => {
    expect(resolveViewportTarget({ files, fragment: null, cloud: { ...near, id: '999' }, splat: null, object: null })).toBeNull()
  })

  it('ignores a fragment hit with no model name', () => {
    expect(resolveViewportTarget({ files, fragment: { ...near }, cloud: null, splat: null, object: null })).toBeNull()
  })
})

describe('resolveViewportTarget for a loaded object', () => {
  it('resolves an object hit to its file by id', () => {
    const resolved = resolveViewportTarget({ files, fragment: null, cloud: null, splat: null, object: { ...near, fileId: '3' } })

    expect(resolved?.file.id).toBe(3)
    expect(resolved?.kind).toBe('object')
  })

  it('resolves a DXF drawing, whose scene object is keyed the same way a model is', () => {
    const resolved = resolveViewportTarget({ files, fragment: null, cloud: null, splat: null, object: { ...near, fileId: '4' } })

    expect(resolved?.file.id).toBe(4)
    expect(resolved?.kind).toBe('object')
    expect(resolved?.capabilities).toEqual({ rotation: 'yaw', scale: true })
  })

  it('lets a GLB be scaled but not pitched', () => {
    const resolved = resolveViewportTarget({ files, fragment: null, cloud: null, splat: null, object: { ...near, fileId: '3' } })

    expect(resolved?.capabilities).toEqual({ rotation: 'yaw', scale: true })
  })

  it('takes the nearest of all three sources', () => {
    const resolved = resolveViewportTarget({
      files,
      fragment: { ...far, modelId: 'tower.frag' },
      cloud: { ...far, id: '2' },
      splat: null,
      object: { ...near, fileId: '3' },
    })

    expect(resolved?.kind).toBe('object')
  })

  it('still lets the fragment win a tie', () => {
    const resolved = resolveViewportTarget({
      files,
      fragment: { ...near, modelId: 'tower.frag' },
      cloud: null,
      splat: null,
      object: { ...near, fileId: '3' },
    })

    expect(resolved?.kind).toBe('model')
  })

  it('finds nothing when the object belongs to no known file', () => {
    const resolved = resolveViewportTarget({ files, fragment: null, cloud: null, splat: null, object: { ...near, fileId: '999' } })

    expect(resolved).toBeNull()
  })

  it('resolves a splat hit, with a full transform to edit', () => {
    const resolved = resolveViewportTarget({ files, fragment: null, cloud: null, splat: { ...near, id: '5' }, object: null })
    expect(resolved).toMatchObject({ kind: 'splat', file: { id: 5 } })
    expect(resolved?.capabilities).toEqual(FULL_PLACEMENT)
  })

  it('prefers whichever of a splat and a cloud is nearer', () => {
    const splatWins = resolveViewportTarget({
      files,
      fragment: null,
      cloud: { ...far, id: '2' },
      splat: { ...near, id: '5' },
      object: null,
    })
    expect(splatWins?.kind).toBe('splat')

    const cloudWins = resolveViewportTarget({
      files,
      fragment: null,
      cloud: { ...near, id: '2' },
      splat: { ...far, id: '5' },
      object: null,
    })
    expect(cloudWins?.kind).toBe('cloud')
  })

  it('ignores a splat hit with no matching file record', () => {
    expect(resolveViewportTarget({ files, fragment: null, cloud: null, splat: { ...near, id: '999' }, object: null })).toBeNull()
  })
})
