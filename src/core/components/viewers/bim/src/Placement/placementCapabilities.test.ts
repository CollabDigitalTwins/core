// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { capabilitiesForFile, dropsAtOrigin } from './placementCapabilities'

import type { DbFile } from '../../../../../types/dbTypes'

const file = (extension: string) => ({ id: 1, name: `a.${extension}`, extension } as DbFile)

describe('capabilitiesForFile', () => {
  it('lets a point cloud carry a full transform, which its JSON blob holds', () => {
    expect(capabilitiesForFile(file('laz'))).toEqual({ rotation: 'full', scale: true })
    expect(capabilitiesForFile(file('las'))).toEqual({ rotation: 'full', scale: true })
  })

  it('lets a loaded 3D object be scaled', () => {
    for (const extension of ['glb', 'gltf', 'fbx', 'obj']) {
      expect(capabilitiesForFile(file(extension))).toEqual({ rotation: 'yaw', scale: true })
    }
  })

  it('refuses to scale a BIM model', () => {
    expect(capabilitiesForFile(file('frag'))).toEqual({ rotation: 'yaw', scale: false })
    expect(capabilitiesForFile(file('ifc'))).toEqual({ rotation: 'yaw', scale: false })
  })

  it('lets a DXF be scaled, which is also how its drawing units are set', () => {
    expect(capabilitiesForFile(file('dxf'))).toEqual({ rotation: 'yaw', scale: true })
  })

  it('ignores case, because extensions arrive however they were uploaded', () => {
    expect(capabilitiesForFile(file('GLB')).scale).toBe(true)
    expect(capabilitiesForFile(file('FRAG')).scale).toBe(false)
  })

  it('falls back to the most restrictive set for an extension it does not know', () => {
    expect(capabilitiesForFile(file('wat'))).toEqual({ rotation: 'yaw', scale: false })
    expect(capabilitiesForFile({ id: 1, name: 'a' } as DbFile)).toEqual({ rotation: 'yaw', scale: false })
  })
})

describe('dropsAtOrigin', () => {
  it('drops a BIM model at the origin, whose coordinates the model already carries', () => {
    expect(dropsAtOrigin(file('ifc'))).toBe(true)
    expect(dropsAtOrigin(file('frag'))).toBe(true)
  })

  it('drops a point cloud at the origin, which is surveyed the same way', () => {
    expect(dropsAtOrigin(file('laz'))).toBe(true)
    expect(dropsAtOrigin(file('las'))).toBe(true)
  })

  it('leaves every other 3D object to be placed by hand', () => {
    for (const extension of ['glb', 'gltf', 'dxf', 'obj', 'fbx']) {
      expect(dropsAtOrigin(file(extension))).toBe(false)
    }
  })

  it('leaves a pin to be placed by hand, since a pin at the origin marks nothing', () => {
    expect(dropsAtOrigin(file('pdf'))).toBe(false)
    expect(dropsAtOrigin(file('png'))).toBe(false)
  })

  it('ignores case and a missing extension', () => {
    expect(dropsAtOrigin(file('IFC'))).toBe(true)
    expect(dropsAtOrigin({ id: 1, name: 'a' } as DbFile)).toBe(false)
  })
})
